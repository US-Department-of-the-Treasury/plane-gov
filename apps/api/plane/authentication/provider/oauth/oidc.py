# Python imports
import json
import os
import re
import secrets
import hashlib
import base64
from datetime import datetime
from urllib.parse import urlencode

import pytz

# Package imports
from plane.authentication.adapter.oauth import OauthAdapter
from plane.license.utils.instance_value import get_configuration_value
from plane.authentication.adapter.error import (
    AUTHENTICATION_ERROR_CODES,
    AuthenticationException,
)


def _load_oidc_credentials_from_file():
    """
    Load OIDC credentials from saved JSON file (set by federation flow).

    Returns dict with keys: client_id, client_secret, authorization_url, token_url, userinfo_url
    or empty dict if file doesn't exist.
    """
    creds_file = os.path.join(os.path.dirname(__file__), "..", "..", "oidc_credentials.json")
    creds_file = os.path.normpath(creds_file)

    try:
        if os.path.exists(creds_file):
            with open(creds_file, "r") as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {}


class OIDCOAuthProvider(OauthAdapter):
    """
    OpenID Connect OAuth provider for Login.gov and other OIDC identity providers.

    Supports:
    - Login.gov (federal identity)
    - Azure AD Government
    - Any standard OIDC-compliant IdP

    Features:
    - PKCE flow (required by Login.gov)
    - Configurable endpoints via environment or admin panel
    - Standard OIDC claims mapping
    """

    provider = "oidc"

    def __init__(self, request, code=None, state=None, callback=None):
        # Load credentials from file (set by federation flow) as fallback
        file_creds = _load_oidc_credentials_from_file()

        # Get OIDC configuration from instance config, environment, or saved file
        (
            OIDC_CLIENT_ID,
            OIDC_CLIENT_SECRET,
            OIDC_AUTHORIZATION_URL,
            OIDC_TOKEN_URL,
            OIDC_USERINFO_URL,
            OIDC_SCOPE,
        ) = get_configuration_value(
            [
                {
                    "key": "OIDC_CLIENT_ID",
                    "default": os.environ.get("OIDC_CLIENT_ID") or file_creds.get("client_id"),
                },
                {
                    "key": "OIDC_CLIENT_SECRET",
                    "default": os.environ.get("OIDC_CLIENT_SECRET") or file_creds.get("client_secret"),
                },
                {
                    "key": "OIDC_AUTHORIZATION_URL",
                    "default": os.environ.get("OIDC_AUTHORIZATION_URL") or file_creds.get("authorization_url"),
                },
                {
                    "key": "OIDC_TOKEN_URL",
                    "default": os.environ.get("OIDC_TOKEN_URL") or file_creds.get("token_url"),
                },
                {
                    "key": "OIDC_USERINFO_URL",
                    "default": os.environ.get("OIDC_USERINFO_URL") or file_creds.get("userinfo_url"),
                },
                {
                    "key": "OIDC_SCOPE",
                    "default": os.environ.get("OIDC_SCOPE", "openid email profile"),
                },
            ]
        )

        if not (OIDC_CLIENT_ID and OIDC_AUTHORIZATION_URL and OIDC_TOKEN_URL):
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_NOT_CONFIGURED"],
                error_message="OIDC_NOT_CONFIGURED",
            )

        self.client_id = OIDC_CLIENT_ID
        self.client_secret = OIDC_CLIENT_SECRET
        self.scope = OIDC_SCOPE
        self.token_url = OIDC_TOKEN_URL
        self.userinfo_url = OIDC_USERINFO_URL

        # Generate PKCE challenge for Login.gov compliance
        self.code_verifier = None
        self.code_challenge = None
        if not code:  # Only generate on initiate, not callback
            self.code_verifier, self.code_challenge = self._generate_pkce_pair()

        redirect_uri = f"""{"https" if request.is_secure() else "http"}://{request.get_host()}/auth/oidc/callback/"""

        url_params = {
            "client_id": self.client_id,
            "scope": self.scope,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
        }

        # Add PKCE parameters if generated (Login.gov requires S256)
        if self.code_challenge:
            url_params["code_challenge"] = self.code_challenge
            url_params["code_challenge_method"] = "S256"

        auth_url = f"{OIDC_AUTHORIZATION_URL}?{urlencode(url_params)}"

        super().__init__(
            request,
            self.provider,
            self.client_id,
            self.scope,
            redirect_uri,
            auth_url,
            self.token_url,
            self.userinfo_url,
            self.client_secret,
            code,
            callback=callback,
        )

    @staticmethod
    def _generate_pkce_pair():
        """
        Generate PKCE code verifier and challenge for Login.gov compliance.

        Returns:
            tuple: (code_verifier, code_challenge)
        """
        # Generate a high-entropy code verifier
        code_verifier = secrets.token_urlsafe(64)

        # Create S256 code challenge
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip('=')

        return code_verifier, code_challenge

    def set_token_data(self):
        data = {
            "code": self.code,
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }

        # Include client_secret if configured (some IdPs require it)
        if self.client_secret:
            data["client_secret"] = self.client_secret

        # Include PKCE code_verifier if available in session
        # Note: code_verifier is passed via session in the view layer
        if hasattr(self, '_code_verifier') and self._code_verifier:
            data["code_verifier"] = self._code_verifier

        token_response = self.get_user_token(data=data)
        super().set_token_data(
            {
                "access_token": token_response.get("access_token"),
                "refresh_token": token_response.get("refresh_token", None),
                "access_token_expired_at": (
                    datetime.fromtimestamp(
                        datetime.now(tz=pytz.utc).timestamp() + token_response.get("expires_in", 3600),
                        tz=pytz.utc
                    )
                    if token_response.get("expires_in")
                    else None
                ),
                "refresh_token_expired_at": None,
                "id_token": token_response.get("id_token", ""),
            }
        )

    def set_user_data(self):
        """
        Fetch user info from OIDC userinfo endpoint and map to Plane user format.

        For fpki-validator (PIV authentication), the 'sub' claim is an X.509 Subject DN
        like "CN=John Doe,OU=People,O=Treasury,C=US", not an email address.

        Standard OIDC claims mapping with X.509 DN fallback:
        - sub -> provider_id (unique identifier - full X.509 DN for audit)
        - email -> email (or generated from X.509 DN if not provided)
        - given_name / name / CN -> first_name
        - family_name -> last_name
        - picture -> avatar
        """
        user_info_response = self.get_user_response()

        # Extract email - try multiple locations for PIV/OIDC compatibility
        email = self._extract_email_from_response(user_info_response)

        # If no email found, generate synthetic from DN
        if not email:
            sub_dn = user_info_response.get("sub", "")
            email = self._generate_synthetic_email(sub_dn)

        # Extract name from claims or parse from X.509 DN
        first_name = user_info_response.get("given_name", "")
        last_name = user_info_response.get("family_name", "")

        if not first_name:
            name = user_info_response.get("name", "")
            if not name:
                # Parse name from X.509 DN Common Name
                name = self._extract_cn_from_dn(user_info_response.get("sub", ""))

            # Split name into first/last
            name_parts = name.split(" ", 1) if name else [""]
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Title case the names (PIV certs often have UPPERCASE names)
        first_name = first_name.title() if first_name else ""
        last_name = last_name.title() if last_name else ""

        user_data = {
            "email": email,
            "user": {
                "avatar": user_info_response.get("picture", ""),
                "first_name": first_name,
                "last_name": last_name,
                "provider_id": user_info_response.get("sub"),  # Full X.509 DN for audit trail
                "is_password_autoset": True,
            },
        }
        super().set_user_data(user_data)

    def _generate_synthetic_email(self, sub_dn: str) -> str:
        """
        Generate unique synthetic email from X.509 Distinguished Name.

        Appends a hash suffix to handle collision when multiple users have
        the same Common Name (e.g., two "John Doe" from different agencies).

        Args:
            sub_dn: X.509 Subject DN like "CN=John Doe,OU=People,O=Treasury,C=US"

        Returns:
            Email like "john.doe.a3f2b1@piv.treasury.gov"
        """
        cn = self._extract_cn_from_dn(sub_dn)
        if not cn:
            cn = "unknown"

        # Create short hash from full DN for uniqueness
        dn_hash = hashlib.sha256(sub_dn.encode()).hexdigest()[:6]

        # Sanitize CN for email format (lowercase, spaces to dots, remove special chars)
        sanitized_cn = cn.lower().replace(" ", ".").replace(",", "")
        sanitized_cn = re.sub(r'[^a-z0-9.]', '', sanitized_cn)

        # e.g., "john.doe.a3f2b1@piv.treasury.gov"
        return f"{sanitized_cn}.{dn_hash}@piv.treasury.gov"

    @staticmethod
    def _extract_cn_from_dn(dn: str) -> str:
        """
        Extract Common Name from X.509 Distinguished Name.

        Args:
            dn: X.509 DN like "CN=John Doe,OU=People,O=Treasury,C=US"

        Returns:
            Common Name value (e.g., "John Doe") or empty string
        """
        if not dn:
            return ""
        for part in dn.split(","):
            part = part.strip()
            if part.upper().startswith("CN="):
                return part[3:]
        return ""

    def _extract_email_from_response(self, user_info: dict) -> str:
        """
        Extract email from OIDC userinfo response, checking multiple locations.

        PIV certificates store email in subjectAltNames (rfc822Name), which different
        OIDC providers may expose in different ways:
        1. Standard 'email' claim (most OIDC providers)
        2. subject_alt_names array with rfc822Name entries (some PIV validators)
        3. subjectAltNames array with type/value objects (fpki-validator format)
        4. E= or emailAddress= attribute in the X.509 Subject DN

        Args:
            user_info: OIDC userinfo response dict

        Returns:
            Email address or empty string
        """
        # 1. Standard OIDC email claim
        email = user_info.get("email")
        if email:
            return email

        # 2. subject_alt_names array (some PIV providers)
        # Format: [{"type": "rfc822Name", "value": "user@agency.gov"}, ...]
        san = user_info.get("subject_alt_names") or user_info.get("subjectAltNames") or []
        if isinstance(san, list):
            for entry in san:
                if isinstance(entry, dict):
                    # Format: {"type": "rfc822Name", "value": "email@example.com"}
                    if entry.get("type") == "rfc822Name":
                        return entry.get("value", "")
                elif isinstance(entry, str) and "@" in entry:
                    # Simple string format
                    return entry

        # 3. Extract from X.509 Subject DN (E= or emailAddress= attributes)
        sub_dn = user_info.get("sub", "")
        email = self._extract_email_from_dn(sub_dn)
        if email:
            return email

        return ""

    @staticmethod
    def _extract_email_from_dn(dn: str) -> str:
        """
        Extract email from X.509 DN if present (E= or emailAddress= attributes).

        Args:
            dn: X.509 DN that may contain email attribute

        Returns:
            Email address or empty string
        """
        if not dn:
            return ""
        for part in dn.split(","):
            part = part.strip()
            upper_part = part.upper()
            if upper_part.startswith("E=") or upper_part.startswith("EMAILADDRESS="):
                return part.split("=", 1)[1]
        return ""

    def set_code_verifier(self, code_verifier):
        """Set the PKCE code verifier from session storage."""
        self._code_verifier = code_verifier
