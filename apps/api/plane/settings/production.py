"""Production settings"""

import os

from .common import *  # noqa

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = int(os.environ.get("DEBUG", 0)) == 1

# Honor the 'X-Forwarded-Proto' header for request.is_secure()
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS += ("scout_apm.django",)  # noqa


# Scout Settings
SCOUT_MONITOR = os.environ.get("SCOUT_MONITOR", False)
SCOUT_KEY = os.environ.get("SCOUT_KEY", "")
SCOUT_NAME = "Plane"

# File logging is disabled by default on EB (CloudWatch captures stdout)
# Set ENABLE_FILE_LOGGING=1 to enable local file logging
ENABLE_FILE_LOGGING = int(os.environ.get("ENABLE_FILE_LOGGING", 0)) == 1

LOG_DIR = os.path.join(BASE_DIR, "logs")  # noqa

if ENABLE_FILE_LOGGING and not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Logging configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {
        "verbose": {"format": "%(asctime)s [%(process)d] %(levelname)s %(name)s: %(message)s"},
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "fmt": "%(levelname)s %(asctime)s %(epic)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "level": "INFO",
        },
    },
    "loggers": {
        "plane.api.request": {
            "level": "DEBUG" if DEBUG else "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.api": {
            "level": "DEBUG" if DEBUG else "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.worker": {
            "level": "DEBUG" if DEBUG else "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.exception": {
            "level": "DEBUG" if DEBUG else "ERROR",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.external": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.mongo": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.migrations": {
            "level": "DEBUG" if DEBUG else "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
    },
}

# Add file handler only if explicitly enabled (for local development)
if ENABLE_FILE_LOGGING:
    LOGGING["handlers"]["file"] = {
        "class": "plane.utils.logging.SizedTimedRotatingFileHandler",
        "filename": (
            os.path.join(BASE_DIR, "logs", "plane-debug.log")  # noqa
            if DEBUG
            else os.path.join(BASE_DIR, "logs", "plane-error.log")  # noqa
        ),
        "when": "s",
        "maxBytes": 1024 * 1024 * 1,
        "interval": 1,
        "backupCount": 5,
        "formatter": "json",
        "level": "DEBUG" if DEBUG else "ERROR",
    }
    # Add file handler to plane.exception logger
    LOGGING["loggers"]["plane.exception"]["handlers"] = ["console", "file"]
