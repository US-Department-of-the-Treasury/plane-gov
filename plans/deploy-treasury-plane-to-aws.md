# Deploy Treasury Plane to AWS

## Overview

Deploy the Treasury Plane application to AWS using Terraform IaC and native deployment (no Docker containers in production).

**Architecture:**

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         CloudFront                          │
                                    │   web.plane.treasury.gov  admin.plane.treasury.gov          │
                                    │   space.plane.treasury.gov                                  │
                                    └──────────────────────────────┬──────────────────────────────┘
                                                                   │
                                                        ┌──────────┴──────────┐
                                                        │    S3 Buckets (3)   │
                                                        │    React SPAs       │
                                                        └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         VPC (10.0.0.0/16)                                       │
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              Public Subnets (2 AZs)                                      │   │
│  │                                                                                          │   │
│  │  ┌────────────────────────────────────────────────────────────────────────────────┐     │   │
│  │  │                     ALB (mTLS for PIV authentication)                          │     │   │
│  │  │                     api.plane.treasury.gov                                      │     │   │
│  │  └───────────────────────────────────┬────────────────────────────────────────────┘     │   │
│  │                                      │                                                   │   │
│  └──────────────────────────────────────┼───────────────────────────────────────────────────┘   │
│                                         │                                                       │
│  ┌──────────────────────────────────────┼───────────────────────────────────────────────────┐   │
│  │                              Private Subnets (2 AZs)                                     │   │
│  │                                      │                                                   │   │
│  │  ┌───────────────────────────────────┴────────────────────────────────────────────┐     │   │
│  │  │                    Elastic Beanstalk (Python 3.12)                             │     │   │
│  │  │                                                                                 │     │   │
│  │  │   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐             │     │   │
│  │  │   │  Gunicorn       │   │  Celery Worker  │   │  Celery Beat    │             │     │   │
│  │  │   │  (Django API)   │   │  (Background)   │   │  (Scheduler)    │             │     │   │
│  │  │   └─────────────────┘   └─────────────────┘   └─────────────────┘             │     │   │
│  │  └────────────────────────────────────────────────────────────────────────────────┘     │   │
│  │                                      │                                                   │   │
│  │  ┌───────────────────────────────────┴────────────────────────────────────────────┐     │   │
│  │  │                    Aurora Serverless v2 (PostgreSQL 15)                        │     │   │
│  │  │                    0.5-4 ACU auto-scaling                                       │     │   │
│  │  └────────────────────────────────────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Monthly Cost:** ~$183 (dev), ~$250 (prod)

## Prerequisites

- [ ] AWS CLI v2 configured with Treasury credentials
- [ ] Terraform >= 1.6.0 installed
- [ ] EB CLI installed: `pip install awsebcli`
- [ ] Node.js 20+ and pnpm installed
- [ ] Python 3.12+ installed
- [ ] Federal PKI certificate bundle (for PIV authentication)
- [ ] Login.gov sandbox credentials (for OIDC)

## What's Already Created

The gov-infra-architect agent created:

```
terraform/                          # All Terraform configs
├── versions.tf                     # Provider configuration
├── variables.tf                    # Input variables
├── vpc.tf                          # VPC, subnets, NAT gateways
├── security-groups.tf              # Network security rules
├── database.tf                     # Aurora Serverless v2
├── cache.tf                        # ElastiCache Redis (optional)
├── secrets.tf                      # Secrets Manager
├── alb.tf                          # ALB with mTLS for PIV
├── iam.tf                          # IAM roles and policies
├── eb-application.tf               # Elastic Beanstalk app
├── eb-environment.tf               # EB environment config
├── s3-frontend.tf                  # S3 buckets for React apps
├── cloudfront.tf                   # CloudFront distributions
├── outputs.tf                      # Output values
└── README.md                       # Infrastructure guide

backend/                            # EB backend configuration
├── .ebextensions/                  # EB customizations
├── .platform/nginx/conf.d/         # nginx PIV config
└── Procfile                        # Process definitions

scripts/
├── deploy-backend.sh               # Deploy Django to EB
└── deploy-frontend.sh              # Deploy React to S3

docs/
├── DEPLOYMENT_GUIDE.md             # Complete walkthrough
├── ARCHITECTURE.md                 # Detailed architecture
└── PIV_AUTHENTICATION.md           # PIV/CAC setup guide
```

## Implementation Phases

### Phase 1: Infrastructure Setup

#### 1.1 Configure Terraform Variables

Create `terraform/terraform.tfvars`:

```hcl
aws_region     = "us-east-1"
environment    = "dev"
project_name   = "treasury-plane"
enable_redis   = false              # Use PostgreSQL-first approach

# Elastic Beanstalk
eb_instance_type = "t3.small"
eb_min_instances = 2
eb_max_instances = 4

# Custom domain (optional)
domain_name     = ""                # Leave empty for CloudFront URLs
route53_zone_id = ""

# PIV authentication
enable_piv_mtls = true
```

#### 1.2 Initialize Terraform State Backend (Optional for Teams)

For team deployments, configure S3 backend. Add to `terraform/versions.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "treasury-plane-terraform-state"
    key            = "plane/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

#### 1.3 Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

**Expected time:** 15-20 minutes (Aurora is slowest)

**Resources created:**

- VPC with 4 subnets (2 public, 2 private)
- NAT Gateways (2)
- Aurora Serverless v2 cluster
- Elastic Beanstalk application and environment
- ALB with mTLS listener
- 3 S3 buckets for frontends
- 3 CloudFront distributions
- 5 Secrets Manager secrets
- IAM roles and security groups

### Phase 2: Configure Secrets

#### 2.1 Configure PIV Trust Store

```bash
# Download Federal PKI certificates
curl -o federal-pki.p7b https://repo.fpki.gov/bridge/caCertsIssuedTofbca.p7b

# Convert to PEM
openssl pkcs7 -print_certs -in federal-pki.p7b -out federal-pki.pem

# Upload to trust store bucket
aws s3 mb s3://treasury-plane-piv-trust
aws s3 cp federal-pki.pem s3://treasury-plane-piv-trust/

# Update ALB trust store
TRUST_STORE_ARN=$(terraform output -raw piv_trust_store_arn)
aws elbv2 modify-trust-store \
  --trust-store-arn "$TRUST_STORE_ARN" \
  --ca-certificates-bundle-s3-bucket treasury-plane-piv-trust \
  --ca-certificates-bundle-s3-key federal-pki.pem
```

#### 2.2 Configure Login.gov OIDC

```bash
aws secretsmanager put-secret-value \
  --secret-id treasury-plane/oidc-credentials \
  --secret-string '{
    "client_id": "urn:gov:gsa:openidconnect.profiles:sp:sso:treasury:plane",
    "client_secret": "<from-logingov-dashboard>",
    "issuer": "https://idp.int.identitysandbox.gov/"
  }'
```

### Phase 3: Backend Deployment

#### 3.1 Prepare Django for Elastic Beanstalk

The Django API is in `apps/api/`. The EB configs are in `backend/`. We need to:

1. Copy EB configs to `apps/api/`
2. Initialize EB CLI
3. Deploy

```bash
# Copy EB configuration to Django app
cp -r backend/.ebextensions apps/api/
cp -r backend/.platform apps/api/
cp backend/Procfile apps/api/

# Initialize EB CLI
cd apps/api
eb init treasury-plane \
  --platform "Python 3.12" \
  --region us-east-1

# Connect to existing environment
eb use treasury-plane-dev
```

#### 3.2 Update Django Production Settings

The existing `apps/api/plane/settings/production.py` needs updates for AWS Secrets Manager. Create `apps/api/plane/settings/aws.py`:

```python
"""AWS Elastic Beanstalk production settings"""
import os
import json
import boto3
from .common import *  # noqa

DEBUG = False

# Fetch secrets from Secrets Manager
def get_secret(secret_id):
    client = boto3.client('secretsmanager', region_name=os.getenv('AWS_REGION', 'us-east-1'))
    response = client.get_secret_value(SecretId=secret_id)
    return json.loads(response['SecretString'])

# Database from Secrets Manager
db_secret = get_secret(os.environ['DB_SECRET_ARN'])
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_secret['dbname'],
        'USER': db_secret['username'],
        'PASSWORD': db_secret['password'],
        'HOST': db_secret['host'],
        'PORT': db_secret['port'],
        'CONN_MAX_AGE': 600,
        'CONN_HEALTH_CHECKS': True,
    }
}

# Django secret key
SECRET_KEY = os.environ.get('SECRET_KEY') or get_secret(os.environ['DJANGO_SECRET_ARN'])

# Allowed hosts
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Security settings
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Static files (WhiteNoise)
STATIC_ROOT = '/var/app/current/staticfiles'
STATIC_URL = '/static/'
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOW_CREDENTIALS = True
```

#### 3.3 Deploy Backend

```bash
cd apps/api

# Deploy using script
../../scripts/deploy-backend.sh

# OR manually
eb deploy treasury-plane-dev

# Verify
eb health
curl $(eb printenv | grep -oP 'https://[^"]+') /api/health/
```

### Phase 4: Frontend Deployment

#### 4.1 Build Frontend Apps

```bash
# From repo root
cd /Users/corcoss/code/plane

# Install dependencies
pnpm install

# Build all apps
pnpm run build
```

#### 4.2 Configure Environment Variables

Create `.env.production` files for each app:

**apps/web/.env.production:**

```bash
VITE_API_BASE_URL=https://api.plane.treasury.gov
VITE_ADMIN_BASE_URL=https://admin.plane.treasury.gov
VITE_SPACE_BASE_URL=https://space.plane.treasury.gov
VITE_LIVE_BASE_URL=https://api.plane.treasury.gov
```

**apps/admin/.env.production:**

```bash
VITE_API_BASE_URL=https://api.plane.treasury.gov
VITE_ADMIN_BASE_PATH=/god-mode
```

**apps/space/.env.production:**

```bash
VITE_API_BASE_URL=https://api.plane.treasury.gov
VITE_SPACE_BASE_PATH=/spaces
```

#### 4.3 Deploy Frontend Apps

```bash
# Deploy each app
./scripts/deploy-frontend.sh web
./scripts/deploy-frontend.sh admin
./scripts/deploy-frontend.sh space
```

### Phase 5: Live Service (WebSocket)

The Live service (`apps/live/`) provides real-time collaboration via Hocuspocus. Options:

**Option A: Run on Elastic Beanstalk (Recommended)**

Add to the EB Procfile:

```
web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker plane.asgi:application
live: node /var/app/current/live/dist/start.mjs
```

**Option B: Separate Node.js Deployment**

Deploy `apps/live/` to a separate EB environment with Node.js platform.

**Option C: Skip for MVP**

If real-time collaboration isn't critical for initial launch, skip the Live service. Users can still use the app; they just won't see real-time updates from other users.

### Phase 6: Post-Deployment

#### 6.1 Run Migrations

```bash
eb ssh
source /var/app/venv/*/bin/activate
cd /var/app/current
python manage.py migrate
python manage.py createsuperuser --email admin@treasury.gov
exit
```

#### 6.2 Test Authentication

**PIV Test:**

1. Navigate to `https://api.plane.treasury.gov/api/users/me/`
2. Select PIV certificate when prompted
3. Enter PIN
4. Should return user profile JSON

**OIDC Test:**

1. Navigate to `https://web.plane.treasury.gov`
2. Click "Login with Login.gov"
3. Complete Login.gov sandbox authentication
4. Should redirect back with session

#### 6.3 Configure DNS (Optional)

If using custom domains, add Route53 records:

- `api.plane.treasury.gov` → ALB
- `web.plane.treasury.gov` → CloudFront
- `admin.plane.treasury.gov` → CloudFront
- `space.plane.treasury.gov` → CloudFront

## Acceptance Criteria

- [ ] Infrastructure deploys successfully with `terraform apply`
- [ ] Django API health check returns 200
- [ ] Frontend apps load in browser
- [ ] PIV authentication works (certificate prompt, PIN entry, auth success)
- [ ] OIDC authentication redirects to Login.gov and back
- [ ] Database migrations run successfully
- [ ] CloudWatch logs show application activity
- [ ] Aurora auto-scales based on load

## Success Metrics

| Metric                  | Target  |
| ----------------------- | ------- |
| API response time (p95) | < 500ms |
| Frontend load time      | < 3s    |
| Monthly cost            | < $300  |
| Uptime                  | > 99.5% |

## Dependencies & Risks

### Dependencies

- Federal PKI certificates for PIV trust store
- Login.gov sandbox credentials
- Treasury AWS account access
- Route53 zone (if using custom domains)

### Risks

| Risk                            | Mitigation                                           |
| ------------------------------- | ---------------------------------------------------- |
| VPN blocks new ALB              | Test connectivity with `nc -zv` before debugging app |
| Aurora cold start latency       | Keep min ACU at 0.5, not 0                           |
| CloudFront propagation delay    | Wait 15-30 min after changes                         |
| PIV cert revocation not checked | Plan Phase 2: PIV validation service                 |

## Cost Breakdown

| Component         | Monthly Cost | Notes                           |
| ----------------- | ------------ | ------------------------------- |
| NAT Gateway (2)   | $65          | Biggest cost; can use 1 for dev |
| Aurora Serverless | $43          | 0.5 ACU minimum                 |
| EB (2x t3.small)  | $30          | Can use t3.micro for dev        |
| ALB               | $23          | Required for mTLS               |
| CloudFront (3)    | $5           | Pay-as-you-go                   |
| S3                | $3           | Negligible for static assets    |
| Secrets Manager   | $2           | 5 secrets                       |
| **Total**         | **~$183**    | Dev environment                 |

## References

- [terraform/README.md](../terraform/README.md) - Terraform configuration guide
- [docs/DEPLOYMENT_GUIDE.md](../docs/DEPLOYMENT_GUIDE.md) - Detailed deployment walkthrough
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
- [docs/PIV_AUTHENTICATION.md](../docs/PIV_AUTHENTICATION.md) - PIV/CAC setup
- [TREASURY.md](../TREASURY.md) - Treasury-specific documentation
