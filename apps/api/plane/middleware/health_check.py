"""
Middleware to handle Host header normalization for AWS ALB/ELB environments.

When behind an AWS ALB, requests may arrive with IP addresses as the Host header:
- ELB health checks use the instance's private IP
- Some ALB configurations may forward requests with the ALB's IP

This middleware normalizes these to 'localhost' so Django's ALLOWED_HOSTS check passes.
The actual security is provided by the ALB (which only accepts traffic on configured domains)
and the VPC security groups.
"""

import ipaddress
import os


class HealthCheckMiddleware:
    """
    Normalizes Host headers that are IP addresses to 'localhost'.

    Must be placed BEFORE django.middleware.common.CommonMiddleware in MIDDLEWARE.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Get the allowed domain from environment for X-Forwarded-Host check
        self.allowed_domain = os.environ.get("ALLOWED_HOSTS", "").replace("*.", "")

    def __call__(self, request):
        host = request.META.get("HTTP_HOST", "")
        forwarded_host = request.META.get("HTTP_X_FORWARDED_HOST", "")

        # If we have X-Forwarded-Host from ALB, use that instead
        if forwarded_host and self._is_valid_domain(forwarded_host):
            request.META["HTTP_HOST"] = forwarded_host
        # If Host is an IP address, replace with localhost
        elif self._is_ip_address(host):
            request.META["HTTP_HOST"] = "localhost"

        return self.get_response(request)

    def _is_ip_address(self, host: str) -> bool:
        """Check if the host is an IP address (v4 or v6)."""
        try:
            # Handle host:port format
            host_part = host.split(":")[0]
            ipaddress.ip_address(host_part)
            return True
        except ValueError:
            return False

    def _is_valid_domain(self, host: str) -> bool:
        """Check if the host matches our allowed domain pattern."""
        if not self.allowed_domain:
            return False
        # Handle host:port format
        host_part = host.split(":")[0]
        return host_part.endswith(self.allowed_domain)
