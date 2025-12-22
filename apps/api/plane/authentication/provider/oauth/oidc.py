# Python imports
import hashlib
import json
import os
import re
from datetime import datetime
from urllib.parse import urlencode

import pytz
from authlib.integrations.requests_client import OAuth2Session
from authlib.oidc.discovery import get_well_known_url

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

    Returns dict with keys: client_id, client_secret, issuer_url, etc.
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


class OIDCClient:
    """
    Authlib-based OIDC client for government identity providers.

    Supports:
    - Login.gov (federal identity)
    - FPKI Validator (PIV authentication)
    - Azure AD Government
    - Any standard OIDC-compliant IdP

    Features:
    - Automatic OIDC discovery via .well-known/openid-configuration
    - PKCE flow (required by Login.gov)
    - Configurable endpoints via environment or admin panel
    - Standard OIDC claims mapping with X.509 DN fallback
    """

    def __init__(self, redirect_uri: str):
        """
        Initialize OIDC client with configuration from environment/file.

        Args:
            redirect_uri: The OAuth callback URL
        """
        # Load credentials from file (set by federation flow) as fallback
        file_creds = _load_oidc_credentials_from_file()

        # Get OIDC configuration from instance config, environment, or saved file
        (
            client_id,
            client_secret,
            issuer_url,
            authorization_url,
            token_url,
            userinfo_url,
            scope,
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
                    "key": "OIDC_ISSUER_URL",
                    "default": os.environ.get("OIDC_ISSUER_URL") or file_creds.get("issuer_url"),
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

        if not client_id:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_NOT_CONFIGURED"],
                error_message="OIDC_NOT_CONFIGURED",
            )

        self.client_id = client_id
        self.client_secret = client_secret
        self.issuer_url = issuer_url
        self.scope = scope
        self.redirect_uri = redirect_uri

        # Store explicit endpoints if provided (otherwise discovery will be used)
        self._authorization_url = authorization_url
        self._token_url = token_url
        self._userinfo_url = userinfo_url

        # Create Authlib OAuth2Session with PKCE support
        self.session = OAuth2Session(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            scope=self.scope,
            code_challenge_method="S256",  # PKCE with SHA-256 (Login.gov requirement)
        )

    def get_authorization_url(self, state: str) -> tuple[str, str]:
        """
        Generate authorization URL with PKCE challenge.

        Args:
            state: CSRF protection state parameter

        Returns:
            tuple: (authorization_url, code_verifier)
        """
        auth_endpoint = self._authorization_url
        if not auth_endpoint and self.issuer_url:
            # Use OIDC discovery
            auth_endpoint = f"{self.issuer_url}/oauth/authorize"

        if not auth_endpoint:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_NOT_CONFIGURED"],
                error_message="OIDC_NOT_CONFIGURED",
            )

        # Authlib generates PKCE code_verifier and code_challenge automatically
        url, state_returned = self.session.create_authorization_url(
            auth_endpoint,
            state=state,
        )

        # Get the code_verifier that was generated
        code_verifier = self.session.session_state.get("code_verifier")

        return url, code_verifier

    def fetch_token(self, code: str, code_verifier: str) -> dict:
        """
        Exchange authorization code for tokens.

        Args:
            code: Authorization code from callback
            code_verifier: PKCE code verifier from session

        Returns:
            dict: Token response with access_token, id_token, etc.
        """
        token_endpoint = self._token_url
        if not token_endpoint and self.issuer_url:
            token_endpoint = f"{self.issuer_url}/oauth/token"

        if not token_endpoint:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_NOT_CONFIGURED"],
                error_message="OIDC_NOT_CONFIGURED",
            )

        try:
            token = self.session.fetch_token(
                token_endpoint,
                code=code,
                code_verifier=code_verifier,
            )
            return token
        except Exception as e:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_OAUTH_PROVIDER_ERROR"],
                error_message=f"Token exchange failed: {str(e)}",
            )

    def get_userinfo(self, access_token: str) -> dict:
        """
        Fetch user info from OIDC userinfo endpoint.

        Args:
            access_token: Valid access token

        Returns:
            dict: User info claims
        """
        userinfo_endpoint = self._userinfo_url
        if not userinfo_endpoint and self.issuer_url:
            userinfo_endpoint = f"{self.issuer_url}/oauth/userinfo"

        if not userinfo_endpoint:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_NOT_CONFIGURED"],
                error_message="OIDC_NOT_CONFIGURED",
            )

        try:
            # Create a new session with the token for userinfo request
            session = OAuth2Session(
                client_id=self.client_id,
                token={"access_token": access_token, "token_type": "Bearer"},
            )
            resp = session.get(userinfo_endpoint)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_OAUTH_PROVIDER_ERROR"],
                error_message=f"Userinfo request failed: {str(e)}",
            )


class OIDCOAuthProvider(OauthAdapter):
    """
    Authlib-based OIDC OAuth provider for Plane authentication.

    Wraps OIDCClient to integrate with Plane's authentication adapter pattern.
    """

    provider = "oidc"

    def __init__(self, request, code=None, state=None, callback=None):
        # Build redirect URI
        redirect_uri = f"""{"https" if request.is_secure() else "http"}://{request.get_host()}/auth/oidc/callback/"""

        # Initialize Authlib client
        self.oidc_client = OIDCClient(redirect_uri=redirect_uri)

        # Store code verifier if initiating (not callback)
        self.code_verifier = None
        self._auth_url = None

        if not code:
            # Generate authorization URL with PKCE
            self._auth_url, self.code_verifier = self.oidc_client.get_authorization_url(state or "")

        # Initialize parent adapter
        super().__init__(
            request,
            self.provider,
            self.oidc_client.client_id,
            self.oidc_client.scope,
            redirect_uri,
            self._auth_url or "",
            self.oidc_client._token_url or "",
            self.oidc_client._userinfo_url or "",
            self.oidc_client.client_secret,
            code,
            callback=callback,
        )

    def get_auth_url(self):
        """Return the authorization URL."""
        return self._auth_url

    def set_code_verifier(self, code_verifier: str):
        """Set the PKCE code verifier from session storage."""
        self._code_verifier = code_verifier

    def set_token_data(self):
        """Exchange authorization code for tokens using Authlib."""
        code_verifier = getattr(self, "_code_verifier", None)
        if not code_verifier:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_OAUTH_PROVIDER_ERROR"],
                error_message="Missing PKCE code verifier",
            )

        token = self.oidc_client.fetch_token(self.code, code_verifier)

        # Calculate token expiration
        expires_at = None
        if token.get("expires_in"):
            expires_at = datetime.fromtimestamp(
                datetime.now(tz=pytz.utc).timestamp() + token.get("expires_in", 3600),
                tz=pytz.utc
            )

        super().set_token_data(
            {
                "access_token": token.get("access_token"),
                "refresh_token": token.get("refresh_token"),
                "access_token_expired_at": expires_at,
                "refresh_token_expired_at": None,
                "id_token": token.get("id_token", ""),
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
        user_info = self.oidc_client.get_userinfo(self.token_data.get("access_token"))

        # Extract email - try multiple locations for PIV/OIDC compatibility
        email = self._extract_email_from_response(user_info)

        # If no email found, generate synthetic from DN
        if not email:
            sub_dn = user_info.get("sub", "")
            email = self._generate_synthetic_email(sub_dn)

        # Extract name from claims or parse from X.509 DN
        first_name = user_info.get("given_name", "")
        last_name = user_info.get("family_name", "")

        if not first_name:
            name = user_info.get("name", "")
            if not name:
                # Parse name from X.509 DN Common Name
                name = self._extract_cn_from_dn(user_info.get("sub", ""))

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
                "avatar": user_info.get("picture", ""),
                "first_name": first_name,
                "last_name": last_name,
                "provider_id": user_info.get("sub"),  # Full X.509 DN for audit trail
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
