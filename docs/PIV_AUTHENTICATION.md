# PIV/CAC Authentication Implementation

This document describes the PIV/CAC authentication implementation for Treasury Plane.

## Architecture

```
┌─────────────┐   HTTPS + Client Cert   ┌──────────┐   X-Client-Cert Header   ┌─────────────┐
│   Browser   ├────────────────────────►│   ALB    ├──────────────────────────►│   Django    │
│   (PIV/CAC) │   Federal PKI Trust     │  (mTLS)  │   PEM-encoded cert       │  Middleware │
└─────────────┘                         └──────────┘                          └─────────────┘
                                              │
                                              ├─ Validates cert chain (Fed Common Policy CA)
                                              ├─ Checks expiration
                                              └─ Forwards to Django for policy validation
```

## Components

### 1. ALB Mutual TLS (Terraform-managed)

The ALB terminates mTLS and validates the client certificate chain against the Federal PKI trust store.

**Trust Store Setup:**

```bash
# Download Federal Common Policy CA certificate bundle
curl -o federal-common-policy-ca.pem \
  https://repo.fpki.gov/bridge/caCertsIssuedTofbca.p7b

# Upload to ALB trust store (see terraform/README.md)
```

### 2. nginx Certificate Extraction (EB Platform Hook)

nginx extracts the client certificate and forwards it to Django in the `X-Client-Cert` header.

**File:** `.platform/nginx/conf.d/piv-mtls.conf`

```nginx
# Extract client certificate from ALB
# ALB sends certificate in X-Amzn-Mtls-Clientcert header
map $http_x_amzn_mtls_clientcert $client_cert_pem {
    default $http_x_amzn_mtls_clientcert;
}

# Forward to Django application
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Forward client certificate to Django
    proxy_set_header X-Client-Cert $client_cert_pem;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

### 3. Django PIV Middleware

Django middleware extracts and validates the PIV certificate.

**File:** `plane/authentication/middleware.py`

```python
import logging
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.functional import SimpleLazyObject

logger = logging.getLogger(__name__)
User = get_user_model()


class PIVAuthenticationMiddleware:
    """
    Middleware to authenticate users via PIV/CAC client certificates.

    ALB validates the certificate chain against Federal PKI trust store.
    This middleware extracts subject fields and policy OIDs for user identification.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if PIV authentication is enabled
        if not getattr(settings, 'ENABLE_PIV_AUTH', False):
            return self.get_response(request)

        # Get client certificate from header
        cert_pem = request.META.get('HTTP_X_CLIENT_CERT')

        if cert_pem:
            try:
                # Parse certificate
                cert = self._parse_certificate(cert_pem)

                # Validate certificate policies
                if self._validate_piv_policies(cert):
                    # Extract user identity
                    user = self._get_or_create_user(cert)
                    request.user = user
                    logger.info(f"PIV authentication successful for {user.email}")
                else:
                    logger.warning("Certificate does not contain valid PIV authentication policy")

            except Exception as e:
                logger.error(f"PIV certificate validation failed: {e}")

        return self.get_response(request)

    def _parse_certificate(self, cert_pem):
        """Parse PEM-encoded certificate."""
        # URL decode if needed (ALB may URL-encode the header)
        from urllib.parse import unquote
        cert_pem = unquote(cert_pem)

        # Add PEM headers if missing
        if not cert_pem.startswith('-----BEGIN CERTIFICATE-----'):
            cert_pem = f"-----BEGIN CERTIFICATE-----\n{cert_pem}\n-----END CERTIFICATE-----"

        cert_bytes = cert_pem.encode('utf-8')
        return x509.load_pem_x509_certificate(cert_bytes, default_backend())

    def _validate_piv_policies(self, cert):
        """
        Validate that certificate contains PIV authentication policy OID.

        Federal PIV Authentication Policy OIDs:
        - 2.16.840.1.101.3.2.1.3.13 (PIV Auth)
        - 2.16.840.1.101.3.2.1.3.17 (PIV Auth with hardware)
        """
        PIV_AUTH_OIDS = [
            '2.16.840.1.101.3.2.1.3.13',  # PIV Authentication
            '2.16.840.1.101.3.2.1.3.17',  # PIV Authentication - Hardware
        ]

        try:
            policies_ext = cert.extensions.get_extension_for_oid(
                x509.oid.ExtensionOID.CERTIFICATE_POLICIES
            )

            for policy in policies_ext.value:
                if policy.policy_identifier.dotted_string in PIV_AUTH_OIDS:
                    return True

        except x509.ExtensionNotFound:
            logger.warning("Certificate does not contain policy extension")

        return False

    def _get_or_create_user(self, cert):
        """
        Extract user identity from certificate and create/update user account.

        Certificate subject fields:
        - CN (Common Name): User's full name
        - UID (User ID): Employee ID or UUID
        - emailAddress: Email address
        """
        # Extract subject fields
        subject = cert.subject

        cn = self._get_subject_attr(subject, x509.NameOID.COMMON_NAME)
        uid = self._get_subject_attr(subject, x509.NameOID.USER_ID)
        email = self._get_subject_attr(subject, x509.NameOID.EMAIL_ADDRESS)

        # Serial number for audit logging
        serial_number = cert.serial_number

        # Get or create user by email
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': uid or email.split('@')[0],
                'first_name': cn.split()[0] if cn else '',
                'last_name': ' '.join(cn.split()[1:]) if cn and len(cn.split()) > 1 else '',
                'is_active': True,
            }
        )

        # Update certificate serial number for audit trail
        if hasattr(user, 'piv_certificate_serial'):
            user.piv_certificate_serial = str(serial_number)
            user.save(update_fields=['piv_certificate_serial'])

        if created:
            logger.info(f"Created new user from PIV certificate: {email}")

        return user

    def _get_subject_attr(self, subject, oid):
        """Get attribute from certificate subject."""
        try:
            return subject.get_attributes_for_oid(oid)[0].value
        except (IndexError, AttributeError):
            return None


def get_user(request):
    """Helper to get user from request (for MIDDLEWARE setting)."""
    if not hasattr(request, '_cached_user'):
        request._cached_user = request.user
    return request._cached_user
```

### 4. Django Settings Configuration

**File:** `plane/settings/production.py`

```python
# PIV Authentication
ENABLE_PIV_AUTH = os.getenv('ENABLE_PIV_AUTH', 'False') == 'True'

# Add PIV middleware (before AuthenticationMiddleware)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'plane.authentication.middleware.PIVAuthenticationMiddleware',  # Add here
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Trust X-Forwarded-Proto from ALB
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Add certificate serial to User model (optional, for audit)
# Create migration:
# python manage.py makemigrations
```

## Testing PIV Authentication

### Local Testing (without PIV card)

Create a self-signed certificate for testing:

```bash
# Generate private key and certificate
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout test-piv.key -out test-piv.crt -days 365 \
  -subj "/C=US/O=U.S. Government/OU=Department of Treasury/CN=Test User/UID=123456789/emailAddress=test.user@treasury.gov"

# Test with curl
curl -v --cert test-piv.crt --key test-piv.key \
  https://plane.treasury.gov/api/users/me/
```

For local Django testing without ALB:

```python
# In middleware, check for X-Test-Client-Cert header
cert_pem = request.META.get('HTTP_X_CLIENT_CERT') or request.META.get('HTTP_X_TEST_CLIENT_CERT')
```

### Production Testing (with actual PIV card)

1. **Insert PIV card** into smart card reader
2. **Navigate to protected endpoint:** `https://plane.treasury.gov/api/users/me/`
3. **Browser prompts for certificate selection** - choose PIV Auth certificate
4. **Enter PIN** when prompted
5. **Django logs show:** `PIV authentication successful for user@treasury.gov`

## Revocation Checking

**Important:** ALB validates certificate chains but does NOT check revocation status.

For production deployments, implement revocation checking:

### Option 1: OCSP Stapling (Recommended)

Enable OCSP stapling on ALB (currently not supported for mTLS trust stores).

### Option 2: Shared PIV Service (Treasury-wide)

Deploy a shared PIV validation service that checks:

- Certificate revocation lists (CRLs)
- Online Certificate Status Protocol (OCSP)
- Path discovery (cross-certified CAs)

**Pattern:**

```python
# In middleware, call PIV validation service
import requests

response = requests.post(
    'https://piv-validator.treasury.gov/validate',
    json={'certificate': cert_pem},
    timeout=2
)

if response.status_code == 200 and response.json()['valid']:
    # Certificate is valid and not revoked
    user = self._get_or_create_user(cert)
else:
    logger.warning(f"Certificate validation failed: {response.json()['reason']}")
    return HttpResponse('Certificate validation failed', status=403)
```

### Option 3: Local CRL Checking

Download and cache CRLs locally:

```python
from cryptography.x509 import ocsp
import requests

def check_revocation(cert):
    """Check if certificate is revoked via OCSP."""
    try:
        # Get OCSP URL from certificate
        aia_ext = cert.extensions.get_extension_for_oid(
            x509.oid.ExtensionOID.AUTHORITY_INFORMATION_ACCESS
        )

        ocsp_url = None
        for desc in aia_ext.value:
            if desc.access_method == x509.oid.AuthorityInformationAccessOID.OCSP:
                ocsp_url = desc.access_location.value
                break

        if not ocsp_url:
            logger.warning("No OCSP URL found in certificate")
            return True  # Fail open for now

        # Build OCSP request (simplified - needs issuer cert)
        # ... OCSP request logic ...

        return True  # Not revoked

    except Exception as e:
        logger.error(f"OCSP check failed: {e}")
        return True  # Fail open
```

## Security Considerations

1. **Certificate Expiration:** ALB checks expiration, but log it in Django for auditing
2. **Policy OID Validation:** Critical - ensures cert is for authentication, not signing
3. **Revocation Checking:** Required for production ATO
4. **Audit Logging:** Log all PIV authentication attempts (success and failure)
5. **Session Management:** Follow NIST SP 800-63B session timeout requirements

## Troubleshooting

### Browser not prompting for certificate

1. Check that ALB listener has mTLS configured (mode: "verify")
2. Verify trust store contains Federal Common Policy CA
3. Check browser certificate store contains PIV auth certificate

### "Certificate validation failed" error

1. Check Django logs for specific error
2. Verify certificate contains PIV authentication policy OID
3. Check certificate subject contains required fields (CN, UID, email)

### User created but not authenticated

1. Verify middleware is before `AuthenticationMiddleware` in `MIDDLEWARE` setting
2. Check that `ENABLE_PIV_AUTH = True` in environment
3. Verify `request.user` is set in middleware

## References

- [ALB Mutual TLS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/mutual-authentication.html)
- [Federal PKI Playbook](https://playbooks.idmanagement.gov/fpki/)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) - Authentication and Lifecycle Management
- [NIST SP 800-73-4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-73-4.pdf) - PIV Interface Specification
