# Python imports
import json
import os
from urllib.parse import urlencode

import httpx
from authlib.oidc.discovery import get_well_known_url

# Django imports
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

# Module imports
from plane.authentication.utils.host import base_host
from plane.license.utils.instance_value import get_configuration_value


class FederationPageEndpoint(View):
    """
    Render the OAuth client registration page.

    This page allows administrators to register this Plane instance with an
    FPKI Validator (or other OIDC provider that supports dynamic client registration).
    """

    def get(self, request):
        host = base_host(request=request, is_app=True)
        redirect_uri = f"{host}/auth/oidc/callback/"
        callback_url = f"{host}/auth/federation/callback/"

        # Check for error in query params
        error = request.GET.get("error", "")
        error_description = request.GET.get("error_description", "")

        # Get current OIDC config
        (OIDC_CLIENT_ID,) = get_configuration_value([
            {"key": "OIDC_CLIENT_ID", "default": os.environ.get("OIDC_CLIENT_ID", "")},
        ])

        error_html = ""
        if error:
            error_html = f'''
            <div class="error">
                <strong>Registration Failed:</strong> {_escape_html(error_description or error)}
            </div>'''

        configured_html = ""
        if OIDC_CLIENT_ID:
            configured_html = f'''
            <div class="success">
                <strong>Already Configured:</strong> Client ID: {_escape_html(OIDC_CLIENT_ID[:20])}...
                <br>You can re-register to update credentials.
            </div>'''

        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PIV Authentication Setup - Plane</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }}
        .card {{ background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ margin-top: 0; color: #3f76ff; }}
        h2 {{ margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }}
        label {{ display: block; font-weight: 600; margin-bottom: 5px; }}
        input {{ width: 100%; padding: 12px; font-size: 14px; border: 2px solid #ddd; border-radius: 5px; margin-bottom: 15px; font-family: monospace; }}
        .btn {{ display: inline-block; background: #3f76ff; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; text-decoration: none; }}
        .btn.green {{ background: #28a745; }}
        .btn:hover {{ opacity: 0.9; }}
        .nav {{ margin-bottom: 20px; }}
        .nav a {{ color: #3f76ff; text-decoration: none; }}
        .info {{ padding: 15px; background: #e7f3ff; border-radius: 5px; border-left: 4px solid #3f76ff; margin: 20px 0; }}
        .error {{ padding: 15px; background: #f8d7da; border-radius: 5px; border-left: 4px solid #dc3545; margin: 20px 0; color: #721c24; }}
        .success {{ padding: 15px; background: #d4edda; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0; color: #155724; }}
        .divider {{ text-align: center; margin: 30px 0; color: #666; }}
        .divider span {{ background: white; padding: 0 15px; }}
        .divider::before {{ content: ''; display: block; border-top: 1px solid #ddd; margin-top: 10px; position: relative; top: 10px; }}
    </style>
</head>
<body>
    <div class="nav"><a href="/">← Back to Plane</a></div>
    <div class="card">
        <h1>PIV Authentication Setup</h1>
        <p>Register Plane with an FPKI Validator to enable PIV card authentication.</p>
        {error_html}
        {configured_html}

        <div class="info">
            <strong>Automatic Registration:</strong>
            <p>Click the button below to register using your PIV card. You must be an admin on the FPKI Validator.</p>
        </div>

        <form id="autoRegForm">
            <label for="federationUrl">FPKI Validator URL</label>
            <input type="url" id="federationUrl" value="https://fpki-validator.example.gov/fpki-validator" placeholder="https://fpki-validator.example.gov/fpki-validator" required>

            <label for="clientName">Application Name</label>
            <input type="text" id="clientName" value="Plane Treasury" placeholder="My Plane Instance" required>

            <label for="redirectUri">Redirect URI (auto-filled)</label>
            <input type="url" id="redirectUri" value="{_escape_html(redirect_uri)}" readonly>

            <button type="submit" class="btn">Register with PIV Card</button>
        </form>

        <div class="divider"><span>OR</span></div>

        <h2>Manual Entry</h2>
        <p>If you already have credentials from the FPKI Validator admin:</p>

        <form id="credsForm">
            <label for="issuerUrl">FPKI Validator Issuer URL</label>
            <input type="url" id="issuerUrl" placeholder="https://fpki-validator.example.gov/fpki-validator">

            <label for="clientId">Client ID</label>
            <input type="text" id="clientId" placeholder="e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890" required>

            <label for="clientSecret">Client Secret</label>
            <input type="text" id="clientSecret" placeholder="Your client secret" required>

            <button type="submit" class="btn green">Save Credentials</button>
            <span id="result" style="margin-left: 15px;"></span>
        </form>
    </div>
    <script>
        // Auto-registration: use server-side discovery
        document.getElementById('autoRegForm').addEventListener('submit', async (e) => {{
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Discovering...';
            btn.disabled = true;

            const federationUrl = document.getElementById('federationUrl').value.trim();
            const clientName = document.getElementById('clientName').value.trim();
            const redirectUri = document.getElementById('redirectUri').value.trim();

            try {{
                const resp = await fetch('/auth/federation/discover/', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ federationUrl, clientName, redirectUri }})
                }});

                const result = await resp.json();

                if (!resp.ok) {{
                    throw new Error(result.error || 'Discovery failed');
                }}

                // Redirect to IdP for PIV authentication
                window.location.href = result.registrationUrl;
            }} catch (err) {{
                alert('Discovery failed: ' + err.message);
                btn.textContent = originalText;
                btn.disabled = false;
            }}
        }});

        // Manual credential entry
        document.getElementById('credsForm').addEventListener('submit', async (e) => {{
            e.preventDefault();
            const resultEl = document.getElementById('result');
            resultEl.innerHTML = 'Saving...';

            try {{
                const res = await fetch('/auth/federation/save-credentials/', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{
                        issuer_url: document.getElementById('issuerUrl').value.trim(),
                        client_id: document.getElementById('clientId').value.trim(),
                        client_secret: document.getElementById('clientSecret').value.trim()
                    }})
                }});
                const data = await res.json();
                resultEl.innerHTML = data.success
                    ? '<span style="color:#28a745">✓ Saved! <a href="/">Return to Plane</a></span>'
                    : '<span style="color:#dc3545">✗ ' + (data.error || 'Failed to save') + '</span>';
            }} catch (err) {{
                resultEl.innerHTML = '<span style="color:#dc3545">✗ Error: ' + err.message + '</span>';
            }}
        }});
    </script>
</body>
</html>'''
        return HttpResponse(html, content_type='text/html')


@method_decorator(csrf_exempt, name='dispatch')
class FederationDiscoverEndpoint(View):
    """
    Server-side OIDC discovery endpoint using Authlib.

    This performs the OIDC discovery on the server side to avoid browser
    certificate trust issues with self-signed certs in development.
    Uses Authlib's robust OIDC discovery mechanism.
    """

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        federation_url = data.get("federationUrl", "").strip()
        client_name = data.get("clientName", "").strip()
        redirect_uri = data.get("redirectUri", "").strip()

        if not federation_url:
            return JsonResponse({"error": "federationUrl is required"}, status=400)

        # Normalize URL
        if federation_url.endswith("/"):
            federation_url = federation_url[:-1]
        if federation_url.endswith("/.well-known/openid-configuration"):
            federation_url = federation_url[:-len("/.well-known/openid-configuration")]

        # Build callback URL for this app
        host = base_host(request=request, is_app=True)
        callback_url = f"{host}/auth/federation/callback/"

        try:
            # Use Authlib's get_well_known_url helper for OIDC discovery URL
            well_known_url = get_well_known_url(federation_url, external=True)

            # Fetch OIDC discovery document using httpx (Authlib's preferred HTTP client)
            with httpx.Client(timeout=10.0, verify=True) as client:
                response = client.get(well_known_url)
                response.raise_for_status()
                discovery = response.json()

            # Get registration endpoint from discovery document
            registration_endpoint = discovery.get("registration_endpoint")
            if not registration_endpoint:
                # Try mtls_endpoint_aliases (for PIV/mTLS providers)
                mtls_endpoints = discovery.get("mtls_endpoint_aliases", {})
                registration_endpoint = mtls_endpoints.get("registration_endpoint")
            if not registration_endpoint:
                # Fallback to default federation path
                registration_endpoint = f"{discovery.get('issuer', federation_url)}/federation/register"

            # Build registration URL with query params
            params = {
                "client_name": client_name,
                "redirect_uri": redirect_uri,
                "callback": callback_url,
            }
            registration_url = f"{registration_endpoint}?{urlencode(params)}"

            # Store federation URL in session for callback
            request.session["federation_issuer_url"] = federation_url

            return JsonResponse({
                "registrationUrl": registration_url,
                "discoveryDocument": discovery,
            })

        except httpx.HTTPStatusError as e:
            # Log the full error for debugging, but return generic message to user
            return JsonResponse({"error": f"Discovery failed: HTTP {e.response.status_code}"}, status=500)
        except httpx.RequestError:
            # Don't expose internal error details to prevent information leakage
            return JsonResponse({"error": "Discovery failed: Unable to reach identity provider"}, status=500)
        except Exception:
            # Don't expose internal error details to prevent information leakage
            return JsonResponse({"error": "Discovery failed: An unexpected error occurred"}, status=500)


class FederationCallbackEndpoint(View):
    """
    Handle callback from FPKI Validator after PIV-authenticated registration.

    The IdP returns either:
    1. A registration_token (backchannel flow) - exchange for credentials server-side
    2. Credentials in URL fragment (legacy flow) - handled by JavaScript
    """

    def get(self, request):
        host = base_host(request=request, is_app=True)

        # Check for error
        error = request.GET.get("error")
        if error:
            error_desc = request.GET.get("error_description", "")
            return HttpResponseRedirect(
                f"{host}/auth/federation/?error={error}&error_description={error_desc}"
            )

        # Check for registration token (backchannel flow)
        registration_token = request.GET.get("registration_token")

        if registration_token:
            # Exchange token for credentials via backchannel using httpx
            issuer_url = request.session.get("federation_issuer_url", "")
            if not issuer_url:
                return HttpResponseRedirect(
                    f"{host}/auth/federation/?error=session_expired&error_description=Session+expired"
                )

            try:
                complete_url = f"{issuer_url}/federation/complete"

                # Use httpx for server-side HTTP requests (consistent with Authlib)
                with httpx.Client(timeout=10.0, verify=True) as client:
                    response = client.post(
                        complete_url,
                        json={"registration_token": registration_token},
                    )

                if not response.is_success:
                    error_data = response.json()
                    return HttpResponseRedirect(
                        f"{host}/auth/federation/?error={error_data.get('error', 'unknown')}"
                        f"&error_description={error_data.get('error_description', '')}"
                    )

                credentials = response.json()
                client_id = credentials.get("client_id")
                client_secret = credentials.get("client_secret")

                # Save credentials
                _save_oidc_credentials(issuer_url, client_id, client_secret)

                # Clear session
                if "federation_issuer_url" in request.session:
                    del request.session["federation_issuer_url"]

                # Return success page
                return HttpResponse(
                    _get_success_html(client_id, host),
                    content_type='text/html'
                )

            except httpx.RequestError as e:
                return HttpResponseRedirect(
                    f"{host}/auth/federation/?error=server_error&error_description={str(e)}"
                )

        # Legacy flow: credentials in URL fragment (handled by JavaScript)
        return HttpResponse(
            _get_callback_html(host),
            content_type='text/html'
        )


@method_decorator(csrf_exempt, name='dispatch')
class FederationSaveCredentialsEndpoint(View):
    """
    Save OAuth credentials (manual entry or from JavaScript callback).
    """

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        issuer_url = data.get("issuer_url", "").strip()
        client_id = data.get("client_id", "").strip()
        client_secret = data.get("client_secret", "").strip()

        if not client_id or not client_secret:
            return JsonResponse({"error": "Missing client_id or client_secret"}, status=400)

        try:
            _save_oidc_credentials(issuer_url, client_id, client_secret)
            return JsonResponse({"success": True, "message": "Credentials saved"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


def _save_oidc_credentials(issuer_url: str, client_id: str, client_secret: str):
    """
    Save OIDC credentials to a JSON file.

    In production, these should be stored in AWS SSM Parameter Store or
    Django database. For local development, we use a JSON file.
    """
    credentials = {
        "issuer_url": issuer_url,
        "client_id": client_id,
        "client_secret": client_secret,
    }

    # Derive OIDC URLs from issuer
    if issuer_url:
        # Handle port translation for fpki-validator (auth on :8443, API on :8090/:8444)
        auth_base = issuer_url.replace(':8090', ':8443').replace(':8444', ':8443')
        credentials["authorization_url"] = f"{auth_base}/oauth/authorize"
        credentials["token_url"] = f"{issuer_url}/oauth/token"
        credentials["userinfo_url"] = f"{issuer_url}/oauth/userinfo"

    # Save to file (in production, use SSM or database)
    creds_file = os.path.join(os.path.dirname(__file__), "..", "..", "oidc_credentials.json")
    creds_file = os.path.normpath(creds_file)

    with open(creds_file, "w") as f:
        json.dump(credentials, f, indent=2)

    # Also set environment variables for immediate use
    os.environ["OIDC_CLIENT_ID"] = client_id
    os.environ["OIDC_CLIENT_SECRET"] = client_secret
    os.environ["OIDC_ISSUER_URL"] = issuer_url
    if issuer_url:
        os.environ["OIDC_AUTHORIZATION_URL"] = credentials["authorization_url"]
        os.environ["OIDC_TOKEN_URL"] = credentials["token_url"]
        os.environ["OIDC_USERINFO_URL"] = credentials["userinfo_url"]


def _escape_html(text: str) -> str:
    """Escape HTML special characters."""
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _get_success_html(client_id: str, home_url: str) -> str:
    """HTML for successful registration."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Registration Complete - Plane</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }}
        .card {{ background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }}
        h1 {{ margin-top: 0; color: #28a745; }}
        .btn {{ display: inline-block; background: #3f76ff; color: white; padding: 15px 30px; border: none; border-radius: 5px; text-decoration: none; margin-top: 20px; }}
        .client-id {{ font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 4px; margin: 15px 0; word-break: break-all; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>✓ Registration Complete!</h1>
        <p>Your Plane instance has been registered for PIV authentication.</p>
        <div class="client-id">Client ID: {_escape_html(client_id)}</div>
        <p>Credentials have been saved. You can now sign in with your PIV card.</p>
        <a href="{_escape_html(home_url)}" class="btn">Return to Plane</a>
    </div>
</body>
</html>'''


def _get_callback_html(home_url: str) -> str:
    """HTML for callback page (legacy fragment flow)."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Completing Registration...</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }}
        .card {{ background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }}
        h1 {{ margin-top: 0; }}
        .spinner {{ width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #3f76ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }}
        @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
        .success {{ color: #28a745; }}
        .error {{ color: #dc3545; }}
        .btn {{ display: inline-block; background: #3f76ff; color: white; padding: 15px 30px; border: none; border-radius: 5px; text-decoration: none; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="card">
        <h1 id="title">Completing Registration...</h1>
        <div id="spinner" class="spinner"></div>
        <p id="message">Saving your OAuth credentials...</p>
        <div id="actions" style="display: none;">
            <a href="{_escape_html(home_url)}" class="btn">Return to Plane</a>
        </div>
    </div>
    <script>
        (async function() {{
            const titleEl = document.getElementById('title');
            const spinnerEl = document.getElementById('spinner');
            const messageEl = document.getElementById('message');
            const actionsEl = document.getElementById('actions');

            // Parse credentials from URL fragment
            const fragment = window.location.hash.substring(1);
            if (!fragment) {{
                titleEl.textContent = 'Registration Failed';
                titleEl.className = 'error';
                messageEl.textContent = 'No credentials received. Please try again.';
                spinnerEl.style.display = 'none';
                actionsEl.style.display = 'block';
                return;
            }}

            const params = new URLSearchParams(fragment);
            const clientId = params.get('client_id');
            const clientSecret = params.get('client_secret');

            if (!clientId || !clientSecret) {{
                titleEl.textContent = 'Registration Failed';
                titleEl.className = 'error';
                messageEl.textContent = 'Invalid credentials received. Please try again.';
                spinnerEl.style.display = 'none';
                actionsEl.style.display = 'block';
                return;
            }}

            // Clear fragment from URL (security)
            history.replaceState(null, '', window.location.pathname);

            try {{
                const res = await fetch('/auth/federation/save-credentials/', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ client_id: clientId, client_secret: clientSecret }})
                }});
                const data = await res.json();

                if (data.success) {{
                    titleEl.textContent = 'Registration Complete!';
                    titleEl.className = 'success';
                    messageEl.textContent = 'Credentials saved. You can now sign in with your PIV card.';
                }} else {{
                    titleEl.textContent = 'Save Failed';
                    titleEl.className = 'error';
                    messageEl.textContent = data.error || 'Failed to save credentials.';
                }}
            }} catch (err) {{
                titleEl.textContent = 'Save Failed';
                titleEl.className = 'error';
                messageEl.textContent = 'Error: ' + err.message;
            }}

            spinnerEl.style.display = 'none';
            actionsEl.style.display = 'block';
        }})();
    </script>
</body>
</html>'''
