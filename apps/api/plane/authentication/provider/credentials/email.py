# Python imports
import os

# Django imports
from django.contrib.auth.hashers import check_password, make_password

# Package imports
from plane.authentication.adapter.credential import CredentialAdapter
from plane.db.models import User
from plane.authentication.adapter.error import (
    AUTHENTICATION_ERROR_CODES,
    AuthenticationException,
)
from plane.license.utils.instance_value import get_configuration_value

# Dummy password hash for timing attack prevention
# We use a pre-computed hash to avoid revealing user existence via response timing
DUMMY_PASSWORD_HASH = make_password("dummy_password_for_timing_attack_prevention")


class EmailProvider(CredentialAdapter):
    provider = "email"

    def __init__(self, request, key=None, code=None, is_signup=False, callback=None):
        super().__init__(request=request, provider=self.provider, callback=callback)
        self.key = key
        self.code = code
        self.is_signup = is_signup

        (ENABLE_EMAIL_PASSWORD,) = get_configuration_value(
            [
                {
                    "key": "ENABLE_EMAIL_PASSWORD",
                    "default": os.environ.get("ENABLE_EMAIL_PASSWORD"),
                }
            ]
        )

        if ENABLE_EMAIL_PASSWORD == "0":
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["EMAIL_PASSWORD_AUTHENTICATION_DISABLED"],
                error_message="EMAIL_PASSWORD_AUTHENTICATION_DISABLED",
            )

    def set_user_data(self):
        if self.is_signup:
            # Check if the user already exists
            if User.objects.filter(email=self.key).exists():
                # Use generic error to prevent account enumeration
                # Don't reveal that the account already exists
                raise AuthenticationException(
                    error_message="AUTHENTICATION_FAILED",
                    error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED"],
                )

            super().set_user_data(
                {
                    "email": self.key,
                    "user": {
                        "avatar": "",
                        "first_name": "",
                        "last_name": "",
                        "provider_id": "",
                        "is_password_autoset": False,
                    },
                }
            )
            return
        else:
            user = User.objects.filter(email=self.key).first()

            # SECURITY: Timing attack prevention
            # Always perform password check to avoid revealing user existence
            # via response timing differences
            if user:
                password_valid = user.check_password(self.code)
            else:
                # User doesn't exist - perform dummy hash to maintain consistent timing
                check_password(self.code, DUMMY_PASSWORD_HASH)
                password_valid = False

            # Use generic error for both non-existent user and wrong password
            # This prevents account enumeration attacks
            if not password_valid:
                raise AuthenticationException(
                    error_message="AUTHENTICATION_FAILED",
                    error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED"],
                )

            super().set_user_data(
                {
                    "email": self.key,
                    "user": {
                        "avatar": "",
                        "first_name": "",
                        "last_name": "",
                        "provider_id": "",
                        "is_password_autoset": False,
                    },
                }
            )
            return
