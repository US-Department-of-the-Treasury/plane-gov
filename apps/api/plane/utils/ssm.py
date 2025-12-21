"""
AWS SSM Parameter Store utilities for secrets management.

This epic provides functions to fetch secrets from AWS SSM Parameter Store.
Used in production environments; local development uses .env.local files.

Usage:
    from plane.utils.ssm import get_secret, get_secrets_by_path

    # Get a single secret
    api_key = get_secret('/plane/prod/api-key')

    # Get all secrets under a path
    secrets = get_secrets_by_path('/plane/prod')
    # Returns: {'api-key': 'value', 'database-url': 'value', ...}

Naming Convention:
    /{project}/{environment}/{secret-name}
    Examples:
    - /plane/local/database-url
    - /plane/prod/secret-key
    - /plane/staging/redis-url
"""

import logging
from functools import lru_cache
from typing import Optional

logger = logging.getLogger("plane.utils.ssm")

# Lazy-load boto3 to avoid import errors when AWS SDK is not needed
_ssm_client = None


def _get_ssm_client():
    """Get or create SSM client (lazy initialization)."""
    global _ssm_client
    if _ssm_client is None:
        import boto3

        _ssm_client = boto3.client("ssm")
    return _ssm_client


@lru_cache(maxsize=100)
def get_secret(name: str) -> Optional[str]:
    """
    Fetch a secret from AWS SSM Parameter Store.

    Args:
        name: Full parameter name (e.g., '/plane/prod/database-url')

    Returns:
        The decrypted parameter value, or None if not found.

    Raises:
        Exception: If SSM API call fails (other than ParameterNotFound)
    """
    try:
        ssm = _get_ssm_client()
        response = ssm.get_parameter(Name=name, WithDecryption=True)
        return response["Parameter"]["Value"]
    except ssm.exceptions.ParameterNotFound:
        logger.warning(f"SSM parameter not found: {name}")
        return None
    except Exception as e:
        logger.error(f"Failed to fetch SSM parameter {name}: {e}")
        raise


def get_secrets_by_path(path: str) -> dict:
    """
    Fetch all secrets under a path from SSM Parameter Store.

    Args:
        path: The path prefix (e.g., '/plane/prod')

    Returns:
        Dictionary mapping secret names to values.
        Keys are the last segment of the parameter name (e.g., 'database-url').

    Example:
        secrets = get_secrets_by_path('/plane/prod')
        # If SSM has /plane/prod/database-url and /plane/prod/secret-key
        # Returns: {'database-url': 'db://...', 'secret-key': 'abc123'}
    """
    secrets = {}
    ssm = _get_ssm_client()

    try:
        paginator = ssm.get_paginator("get_parameters_by_path")
        for page in paginator.paginate(Path=path, WithDecryption=True, Recursive=True):
            for param in page["Parameters"]:
                # Extract just the secret name from full path
                # /plane/prod/database-url -> database-url
                key = param["Name"].split("/")[-1]
                secrets[key] = param["Value"]
    except Exception as e:
        logger.error(f"Failed to fetch SSM parameters by path {path}: {e}")
        raise

    return secrets


def get_secret_or_env(
    ssm_name: str,
    env_name: str,
    environment: str,
    project: str = "plane",
    default: Optional[str] = None,
) -> Optional[str]:
    """
    Get a secret from SSM (in production) or environment variable (local).

    This is the primary function for getting secrets with automatic
    environment detection.

    Args:
        ssm_name: The secret name in SSM (e.g., 'database-url')
        env_name: The environment variable name (e.g., 'DATABASE_URL')
        environment: Current environment ('local', 'staging', 'prod')
        project: Project name for SSM path (default: 'plane')
        default: Default value if secret not found

    Returns:
        The secret value from SSM (staging/prod) or env var (local).

    Example:
        DATABASE_URL = get_secret_or_env(
            ssm_name='database-url',
            env_name='DATABASE_URL',
            environment=ENVIRONMENT,
        )
    """
    import os

    if environment in ("staging", "prod", "production"):
        # Production/staging: fetch from SSM
        full_path = f"/{project}/{environment}/{ssm_name}"
        try:
            value = get_secret(full_path)
            if value is not None:
                return value
        except Exception:
            # Fall through to env var
            pass

    # Local development or SSM fetch failed: use environment variable
    return os.environ.get(env_name, default)


def clear_cache():
    """Clear the LRU cache for get_secret. Useful for testing."""
    get_secret.cache_clear()
