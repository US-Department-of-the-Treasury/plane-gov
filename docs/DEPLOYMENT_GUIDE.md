# Treasury Plane - Deployment Guide

Complete deployment guide for Treasury Plane on AWS using native deployments (no Docker).

## Quick Start

```bash
# 1. Deploy infrastructure (once)
cd terraform
terraform init
terraform apply

# 2. Configure PIV trust store
./scripts/setup-piv-trust-store.sh

# 3. Deploy backend
cd backend
eb init
eb deploy

# 4. Deploy frontends
./scripts/deploy-frontend.sh web
./scripts/deploy-frontend.sh admin
./scripts/deploy-frontend.sh space
```

## Architecture Summary

| Component          | Technology                          | Purpose                                 |
| ------------------ | ----------------------------------- | --------------------------------------- |
| **Frontend**       | React (3 apps) → S3 + CloudFront    | Static web, admin, space apps           |
| **Backend**        | Django → Elastic Beanstalk (Python) | API server with PIV auth                |
| **Database**       | Aurora Serverless v2 (PostgreSQL)   | Primary data store                      |
| **Cache**          | PostgreSQL (UNLOGGED tables)        | Session storage, cache (Redis optional) |
| **Authentication** | ALB mTLS + Django middleware        | PIV/CAC + Login.gov OIDC                |
| **Real-time**      | Django Channels + Daphne            | WebSocket support                       |

## Prerequisites

### Local Development Machine

- AWS CLI v2 configured with Treasury credentials
- Terraform >= 1.6.0
- Node.js >= 18 (for frontend builds)
- Python >= 3.11 (for backend development)
- EB CLI: `pip install awsebcli`

### AWS Resources Required

- Route53 hosted zone (optional, for custom domain)
- S3 bucket for Terraform state (recommended for teams)
- Federal PKI certificate bundle (for PIV authentication)

## Step 1: Infrastructure Deployment

### Configure Terraform Variables

Create `terraform/terraform.tfvars`:

```hcl
# Basic Configuration
aws_region   = "us-east-1"
environment  = "dev"
project_name = "treasury-plane"

# Enable Redis only if PostgreSQL alternatives don't meet needs
enable_redis = false

# Elastic Beanstalk Configuration
eb_instance_type = "t3.small"
eb_min_instances = 2
eb_max_instances = 4

# Custom Domain (optional)
domain_name     = "plane.treasury.gov"
route53_zone_id = "Z1234567890ABC"

# PIV Authentication
enable_piv_mtls = true
```

### Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Deploy (takes ~15-20 minutes)
terraform apply

# Save outputs
terraform output > ../outputs.txt
```

**Resources Created:**

- VPC with public/private subnets (2 AZs)
- Aurora Serverless v2 PostgreSQL cluster
- Elastic Beanstalk application and environment
- Application Load Balancer with mTLS
- 3 S3 buckets for frontend apps
- 3 CloudFront distributions
- 5 Secrets Manager secrets
- IAM roles and security groups

### Configure PIV Trust Store

After infrastructure deployment, upload Federal PKI certificate bundle:

```bash
# Download Federal Common Policy CA
curl -o federal-common-policy-ca.pem \
  https://repo.fpki.gov/bridge/caCertsIssuedTofbca.p7b

# Convert to PEM format (if needed)
openssl pkcs7 -print_certs \
  -in caCertsIssuedTofbca.p7b \
  -out federal-common-policy-ca.pem

# Create S3 bucket for trust store
aws s3 mb s3://treasury-piv-trust-store

# Upload certificate bundle
aws s3 cp federal-common-policy-ca.pem \
  s3://treasury-piv-trust-store/

# Update ALB trust store
TRUST_STORE_ARN=$(cd terraform && terraform output -raw piv_trust_store_arn)

aws elbv2 modify-trust-store \
  --trust-store-arn "$TRUST_STORE_ARN" \
  --ca-certificates-bundle-s3-bucket treasury-piv-trust-store \
  --ca-certificates-bundle-s3-key federal-common-policy-ca.pem
```

### Configure Application Secrets

Add Login.gov OIDC credentials:

```bash
aws secretsmanager put-secret-value \
  --secret-id treasury-plane/oidc-credentials \
  --secret-string '{
    "client_id": "urn:gov:gsa:openidconnect.profiles:sp:sso:treasury:plane",
    "client_secret": "your-secret-from-logingov-dashboard",
    "issuer": "https://idp.int.identitysandbox.gov/",
    "authorization_endpoint": "https://idp.int.identitysandbox.gov/openid_connect/authorize",
    "token_endpoint": "https://idp.int.identitysandbox.gov/api/openid_connect/token",
    "userinfo_endpoint": "https://idp.int.identitysandbox.gov/api/openid_connect/userinfo",
    "jwks_uri": "https://idp.int.identitysandbox.gov/api/openid_connect/certs"
  }'
```

## Step 2: Backend Deployment

### Prepare Django Application

The backend expects these files (already created):

- `.ebextensions/` - EB configuration
- `.platform/nginx/conf.d/` - nginx PIV configuration
- `Procfile` - Process definitions (Gunicorn + Daphne)
- `requirements.txt` - Python dependencies

### Add Django Settings for AWS

Create `backend/plane/settings/production.py`:

```python
from .base import *
import os
import json
import boto3

# Fetch secrets from Secrets Manager
def get_secret(secret_name):
    client = boto3.client('secretsmanager', region_name=os.getenv('AWS_REGION', 'us-east-1'))
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Database configuration
db_secret = get_secret(os.getenv('DB_SECRET_ARN'))
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_secret['dbname'],
        'USER': db_secret['username'],
        'PASSWORD': db_secret['password'],
        'HOST': db_secret['host'],
        'PORT': db_secret['port'],
        'CONN_MAX_AGE': 600,
    }
}

# Secret key
SECRET_KEY = get_secret(os.getenv('DJANGO_SECRET_ARN'))

# Application config
app_config = get_secret(os.getenv('APP_CONFIG_SECRET_ARN'))
DEBUG = app_config.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = app_config.get('ALLOWED_HOSTS', '').split(',')

# PIV Authentication
ENABLE_PIV_AUTH = app_config.get('ENABLE_PIV_AUTH', 'False') == 'True'

# OIDC Configuration
oidc_config = get_secret(os.getenv('OIDC_SECRET_ARN'))
# ... configure social-auth or authlib with oidc_config ...

# Static files (served by nginx)
STATIC_ROOT = '/var/app/current/staticfiles'
STATIC_URL = '/static/'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/app/current/logs/django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
        },
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

### Initialize Elastic Beanstalk

```bash
cd backend

# Initialize EB CLI
eb init treasury-plane --platform python-3.11 --region us-east-1

# This creates .elasticbeanstalk/config.yml
```

### Deploy Backend

```bash
# Deploy using script
../scripts/deploy-backend.sh

# OR manually:
eb deploy treasury-plane-dev
```

**Deployment process:**

1. EB packages application code
2. Uploads to S3
3. Creates new application version
4. Deploys with rolling updates (50% at a time)
5. Runs migrations via `.ebextensions/99-migrate.config`
6. Restarts Gunicorn and Daphne processes

### Verify Backend Deployment

```bash
# Check environment health
eb health

# Test health endpoint
API_URL=$(cd ../terraform && terraform output -raw api_url)
curl "$API_URL/api/health/"

# Expected response:
# {"status": "healthy", "database": "connected", "version": "1.0.0"}

# View logs
eb logs

# SSH to instance (if needed)
eb ssh
```

## Step 3: Frontend Deployment

### Configure Frontend Environment

All apps are served from a single domain with path-based routing:

| Path | App |
|------|-----|
| `/` | Web app |
| `/god-mode/*` | Admin app |
| `/spaces/*` | Space app |
| `/api/*` | API |
| `/live/*` | WebSocket |

The deploy script automatically configures environment variables from Terraform outputs.
No manual `.env.production` files are needed.

**Key environment variables set by deploy script:**

```bash
VITE_API_BASE_URL=https://plane.treasury.gov/api
VITE_WEB_BASE_URL=https://plane.treasury.gov
VITE_ADMIN_BASE_URL=https://plane.treasury.gov/god-mode
VITE_SPACE_BASE_URL=https://plane.treasury.gov/spaces
VITE_LIVE_BASE_URL=wss://plane.treasury.gov/live
```

### Deploy Frontend Apps

```bash
# Deploy web app
./scripts/deploy-frontend.sh web

# Deploy admin app
./scripts/deploy-frontend.sh admin

# Note: Space app requires SSR and is deployed with the backend
# See deploy-backend.sh for space app deployment
```

**Deployment process per app:**

1. Install npm dependencies
2. Build production bundle with environment variables
3. Upload to S3 with cache-control headers
4. Invalidate CloudFront cache
5. Wait for invalidation to complete

### Verify Frontend Deployment

```bash
# Get frontend URLs
cd terraform
terraform output web_url
terraform output admin_url
terraform output space_url

# Test in browser
open $(terraform output -raw web_url)
```

## Step 4: Post-Deployment Configuration

### Run Database Migrations

If not run during deployment:

```bash
cd backend
eb ssh

# On EB instance:
source /var/app/venv/*/bin/activate
cd /var/app/current
python manage.py migrate
python manage.py collectstatic --noinput
exit
```

### Create Superuser

```bash
eb ssh
source /var/app/venv/*/bin/activate
cd /var/app/current
python manage.py createsuperuser --email admin@treasury.gov
exit
```

### Test PIV Authentication

1. Navigate to API endpoint: `https://plane.treasury.gov/api/users/me/`
2. Browser prompts for certificate selection
3. Choose PIV Authentication certificate
4. Enter PIN
5. Should see user profile JSON response

### Test OIDC Authentication (Login.gov)

1. Navigate to: `https://plane.treasury.gov/login`
2. Click "Login with Login.gov"
3. Redirects to Login.gov sandbox
4. Authenticate with test account
5. Redirects back to Plane with session

## Monitoring and Operations

### View Logs

```bash
# Backend logs
eb logs

# CloudWatch Logs
aws logs tail /aws/elasticbeanstalk/treasury-plane-dev/var/log/web.stdout.log --follow

# Aurora logs (via CloudWatch)
aws logs tail /aws/rds/cluster/treasury-plane-aurora/postgresql --follow
```

### Monitor Performance

**Elastic Beanstalk Health:**

```bash
eb health --refresh
```

**Aurora Performance Insights:**

- AWS Console → RDS → Performance Insights
- View queries, wait events, database load

**CloudWatch Metrics:**

- ALB target response time
- EB instance CPU/memory
- Aurora ACU usage

### Scaling

**Manual scaling:**

```bash
# Scale EB environment
eb scale 4

# Or update Terraform:
eb_min_instances = 4
eb_max_instances = 8
terraform apply
```

**Aurora auto-scales** between 0.5-4 ACU based on load.

## Cost Optimization

### Current Monthly Cost: ~$183

| Component          | Cost | Optimization                        |
| ------------------ | ---- | ----------------------------------- |
| NAT Gateway (2 AZ) | $65  | Use 1 for dev, add VPC endpoints    |
| Aurora Serverless  | $43  | Scales to 0.5 ACU when idle         |
| EB (2x t3.small)   | $30  | Use t3.micro for dev                |
| ALB                | $23  | Required for mTLS                   |
| ElastiCache Redis  | $0   | Not enabled (using PostgreSQL)      |
| CloudFront (1)     | $2   | Pay-as-you-go                       |
| S3                 | $3   | Lifecycle policies for old versions |

**Dev environment optimizations:**

- Use 1 NAT Gateway instead of 2 (~$30/mo savings)
- Use t3.micro instances (~$15/mo savings)
- Reduce Aurora max ACU to 2 (no cost impact)

### PostgreSQL-First Architecture

**Already using PostgreSQL for:**

- Sessions: `SESSION_ENGINE = 'django.contrib.sessions.backends.db'`
- Background jobs: `pg_cron` extension (enabled in parameter group)

**Can add to PostgreSQL:**

- Cache: UNLOGGED tables instead of Redis
- Pub/Sub: LISTEN/NOTIFY for real-time notifications
- Full-text search: `pg_trgm` for fuzzy search

**Only add Redis if you measure actual need.**

## Troubleshooting

### Backend deployment fails

1. Check EB logs: `eb logs`
2. Verify secrets are accessible: test IAM role permissions
3. Check database connectivity: `eb ssh` → `psql -h <aurora-endpoint>`

### Frontend not loading

1. Verify S3 bucket policy allows CloudFront OAC
2. Check CloudFront distribution status (must be "Deployed")
3. Clear browser cache
4. Test direct CloudFront URL (not custom domain)

### PIV authentication fails

1. Check ALB trust store contains Federal PKI certificates
2. Verify Django middleware is configured correctly
3. Check logs for certificate parsing errors
4. Test with self-signed cert first (see `docs/PIV_AUTHENTICATION.md`)

### WebSocket connection fails

1. Verify Daphne process is running: `eb ssh` → `ps aux | grep daphne`
2. Check nginx WebSocket configuration in `.platform/nginx/conf.d/`
3. Verify ALB sticky sessions enabled
4. Test WebSocket endpoint: `wscat -c wss://plane.treasury.gov/live/`

## Security and Compliance

### ATO Requirements Met

- ✅ Encryption at rest (Aurora, S3)
- ✅ Encryption in transit (TLS 1.2+)
- ✅ Network segmentation (public/private subnets)
- ✅ PIV/CAC authentication
- ✅ Audit logging (CloudWatch)
- ✅ Security headers (CloudFront)
- ✅ No public database access
- ✅ IAM roles (no static credentials)

### Additional Requirements

Requires manual configuration:

- VPC Flow Logs
- AWS CloudTrail
- AWS Config
- GuardDuty
- Security Hub
- Revocation checking for PIV certificates

## Rollback

### Rollback Backend

```bash
# List recent versions
eb appversion lifecycle

# Deploy previous version
eb deploy --version <version-label>
```

### Rollback Frontend

```bash
# S3 versioning is enabled - restore previous version
aws s3api list-object-versions --bucket treasury-plane-web-frontend --prefix index.html

# Restore specific version
aws s3api copy-object \
  --copy-source "treasury-plane-web-frontend/index.html?versionId=<VERSION_ID>" \
  --bucket treasury-plane-web-frontend \
  --key index.html

# Invalidate CloudFront (unified distribution)
CLOUDFRONT_ID=$(cd terraform && terraform output -raw cloudfront_id)
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*"
```

## Cleanup

To delete all resources:

```bash
cd terraform
terraform destroy

# Confirm with: yes
```

**Warning:** This deletes:

- Aurora database (final snapshot created for prod)
- All S3 buckets and contents
- CloudFront distributions
- Secrets (30-day recovery window)

## Next Steps

1. **Set up monitoring alerts** - CloudWatch alarms for EB health, Aurora CPU, ALB 5xx errors
2. **Configure backup retention** - Aurora automated backups (7-day retention configured)
3. **Implement revocation checking** - Deploy shared PIV validation service
4. **Add WAF rules** - Protect against common attacks (OWASP Top 10)
5. **Set up CI/CD** - GitHub Actions for automated deployments
6. **Load testing** - Verify scaling behavior under load

## References

- [Terraform Configuration](terraform/README.md)
- [PIV Authentication Guide](docs/PIV_AUTHENTICATION.md)
- [Elastic Beanstalk Python Platform](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-python-apps.html)
- [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [ALB Mutual TLS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/mutual-authentication.html)
