# Treasury Plane - Infrastructure Deployment

This directory contains Terraform configurations for deploying the Treasury Plane application to AWS.

## Architecture

```
Frontend (React) → CloudFront → S3
Backend (Django) → ALB (mTLS) → Elastic Beanstalk → Aurora PostgreSQL
```

## Prerequisites

1. **AWS CLI configured** with Treasury credentials
2. **Terraform** >= 1.6.0
3. **Route53 Hosted Zone** (optional, for custom domain)
4. **Federal PKI Trust Store** (for PIV authentication)

## Initial Setup

### 1. Configure Variables

Create a `terraform.tfvars` file:

```hcl
aws_region     = "us-east-1"
environment    = "dev"
project_name   = "treasury-plane"
enable_redis   = false  # Start without Redis, use PostgreSQL

# Optional: Custom domain (requires Route53 zone)
domain_name      = "plane.treasury.gov"
route53_zone_id  = "Z1234567890ABC"

# Elastic Beanstalk configuration
eb_instance_type = "t3.small"
eb_min_instances = 2
eb_max_instances = 4

# PIV authentication
enable_piv_mtls = true
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Review Plan

```bash
terraform plan
```

Expected resources:

- VPC with public/private subnets (2 AZs)
- Aurora Serverless v2 PostgreSQL
- Elastic Beanstalk environment
- ALB with mTLS support
- S3 buckets for frontend apps (3)
- CloudFront distributions (3)
- Secrets Manager secrets (5)
- IAM roles and security groups

### 4. Deploy Infrastructure

```bash
terraform apply
```

**Deployment time:** ~15-20 minutes (Aurora cluster creation is slowest)

### 5. Post-Deployment: Configure PIV Trust Store

After infrastructure is created, upload Federal PKI certificate bundle to ALB trust store:

```bash
# Download Federal Common Policy CA bundle
curl -o federal-common-policy-ca.pem \
  https://repo.fpki.gov/bridge/caCertsIssuedTofbca.p7b

# Convert from PKCS#7 to PEM (if needed)
openssl pkcs7 -print_certs -in caCertsIssuedTofbca.p7b -out federal-common-policy-ca.pem

# Create S3 bucket for trust store
aws s3 mb s3://treasury-piv-trust-store

# Upload certificate bundle
aws s3 cp federal-common-policy-ca.pem s3://treasury-piv-trust-store/

# Update ALB trust store
TRUST_STORE_ARN=$(terraform output -raw piv_trust_store_arn)
aws elbv2 modify-trust-store \
  --trust-store-arn "$TRUST_STORE_ARN" \
  --ca-certificates-bundle-s3-bucket treasury-piv-trust-store \
  --ca-certificates-bundle-s3-key federal-common-policy-ca.pem
```

### 6. Configure OIDC Credentials

Add Login.gov OIDC credentials to Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id treasury-plane/oidc-credentials \
  --secret-string '{
    "client_id": "your-logingov-client-id",
    "client_secret": "your-logingov-client-secret",
    "issuer": "https://idp.int.identitysandbox.gov/",
    "authorization_endpoint": "https://idp.int.identitysandbox.gov/openid_connect/authorize",
    "token_endpoint": "https://idp.int.identitysandbox.gov/api/openid_connect/token",
    "userinfo_endpoint": "https://idp.int.identitysandbox.gov/api/openid_connect/userinfo"
  }'
```

## Deploying the Application

### Backend (Django API)

See `../backend/README.md` for deployment instructions.

Quick deploy:

```bash
cd ../backend
eb init --profile treasury
eb deploy
```

### Frontend (React Apps)

See `../scripts/deploy-frontend.sh` for deployment script.

Quick deploy:

```bash
cd ../scripts
./deploy-frontend.sh web
./deploy-frontend.sh admin
./deploy-frontend.sh space
```

## Accessing the Application

After deployment, get URLs:

```bash
terraform output api_url
terraform output web_url
terraform output admin_url
terraform output space_url
```

Example output:

```
api_url = "https://api.plane.treasury.gov"
web_url = "https://web.plane.treasury.gov"
admin_url = "https://admin.plane.treasury.gov"
space_url = "https://space.plane.treasury.gov"
```

## Secrets Management

All sensitive values are stored in AWS Secrets Manager:

| Secret               | Purpose                                 |
| -------------------- | --------------------------------------- |
| `/db-credentials`    | Aurora PostgreSQL credentials           |
| `/django-secret-key` | Django SECRET_KEY                       |
| `/oidc-credentials`  | Login.gov OIDC client credentials       |
| `/app-config`        | Application environment variables       |
| `/redis-config`      | ElastiCache Redis endpoint (if enabled) |

Retrieve secret values:

```bash
aws secretsmanager get-secret-value \
  --secret-id treasury-plane/app-config \
  --query SecretString --output text | jq
```

## Cost Optimization

### PostgreSQL-First Architecture

**Before enabling Redis**, verify PostgreSQL alternatives won't work:

| Use Case        | PostgreSQL Alternative | Command                                                  |
| --------------- | ---------------------- | -------------------------------------------------------- |
| Django sessions | Use database backend   | `SESSION_ENGINE = 'django.contrib.sessions.backends.db'` |
| Cache           | UNLOGGED tables        | `CREATE UNLOGGED TABLE cache_table (...)`                |
| Background jobs | pg_cron                | Already enabled in parameter group                       |
| Pub/Sub         | LISTEN/NOTIFY          | Built-in PostgreSQL feature                              |

Enable Redis only if you measure actual performance issues.

### NAT Gateway Cost Reduction

NAT Gateway is the highest cost (~$65/mo for 2 AZs). Options to reduce:

1. **Single AZ for dev** (not HA): Set `eb_min_instances = 1` and use 1 NAT Gateway
2. **VPC Endpoints**: Add S3/DynamoDB endpoints to avoid NAT charges for AWS API calls
3. **Fck-nat**: Open-source NAT instance replacement (~$3-5/mo)

### Aurora Serverless Scaling

Aurora scales down to 0.5 ACU when idle. For dev environments:

- Min: 0.5 ACU (~$43/mo)
- Max: 2.0 ACU (sufficient for most dev workloads)

For production:

- Min: 1.0 ACU
- Max: 4.0 ACU

## Monitoring and Logs

### CloudWatch Logs

View logs for EB environment:

```bash
aws logs tail /aws/elasticbeanstalk/treasury-plane-dev/var/log/web.stdout.log --follow
```

### Elastic Beanstalk Health

Check environment health:

```bash
aws elasticbeanstalk describe-environment-health \
  --environment-name treasury-plane-dev \
  --attribute-names All
```

### Aurora Performance Insights

Performance Insights is enabled by default. View in AWS Console:

- RDS → treasury-plane-aurora-instance-1 → Performance Insights

## Security Compliance

### FISMA/ATO Requirements

This infrastructure includes:

- ✅ Encryption at rest (Aurora, S3)
- ✅ Encryption in transit (TLS 1.2+)
- ✅ Network segmentation (public/private subnets)
- ✅ PIV/CAC authentication support
- ✅ CloudWatch logging
- ✅ Security headers (CloudFront)
- ✅ No public database access
- ✅ IAM roles (no hardcoded credentials)

### Additional Requirements (Not Included)

Manual configuration required:

- VPC Flow Logs (add to `vpc.tf`)
- AWS CloudTrail (organization-level)
- AWS Config rules
- GuardDuty
- Security Hub

## Troubleshooting

### Database Connection Issues

Test database connectivity from EB instance:

```bash
eb ssh
psql -h <aurora-endpoint> -U plane_admin -d plane
```

### PIV Authentication Not Working

Verify trust store is configured:

```bash
aws elbv2 describe-trust-stores
aws elbv2 describe-trust-store-associations
```

Check ALB logs for certificate validation errors:

```bash
aws s3 sync s3://treasury-plane-alb-logs/AWSLogs/ ./alb-logs/
grep "mTLS" ./alb-logs/*.log
```

### Frontend Not Loading

1. Check CloudFront distribution status (should be "Deployed")
2. Verify S3 bucket policy allows CloudFront OAC access
3. Test direct CloudFront URL (not custom domain)

### EB Environment Health Degraded

1. Check instance logs: `eb logs`
2. Verify health check endpoint: `curl https://api.plane.treasury.gov/api/health/`
3. Check security group rules allow ALB → EB communication

### 403 Forbidden on POST Requests (Auth/API)

If POST requests to `/auth/*` or other endpoints return 403 while GET works:

1. **Check CloudFront behaviors** - S3 default only allows GET/HEAD
2. Verify the URL pattern has a behavior routing to ALB in `cloudfront.tf`
3. See `docs/solutions/infrastructure-issues/cloudfront-missing-auth-route-403.md`

### Secrets Not Updating After Secrets Manager Change

EB instances don't pick up new secrets on restart - ebextensions only run on deploy:

1. **Always redeploy after secrets change**: `./scripts/deploy-backend.sh`
2. See `docs/solutions/infrastructure-issues/eb-secrets-require-redeploy.md`

## Cleanup

To destroy all infrastructure:

```bash
terraform destroy
```

**Warning:** This will delete:

- Aurora database (final snapshot created if `environment = "prod"`)
- All S3 buckets and contents
- CloudFront distributions
- All secrets (30-day recovery period)

## References

- [Elastic Beanstalk Python Platform](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-python-apps.html)
- [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [ALB Mutual TLS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/mutual-authentication.html)
- [Federal PKI](https://playbooks.idmanagement.gov/fpki/)
