# Treasury Plane - Infrastructure Quick Reference

## URLs

```bash
# Get all URLs after deployment
cd terraform
terraform output api_url
terraform output web_url
terraform output admin_url
terraform output space_url
```

## Deployment Commands

### Infrastructure (once)

```bash
cd terraform
terraform init
terraform apply
```

### Backend (frequent)

```bash
cd backend
eb deploy
```

### Frontend (frequent)

```bash
./scripts/deploy-frontend.sh web
./scripts/deploy-frontend.sh admin
./scripts/deploy-frontend.sh space
```

## Architecture at a Glance

```
Frontend:  React → CloudFront → S3
Backend:   Django → ALB (mTLS) → Elastic Beanstalk → Aurora PostgreSQL
Auth:      PIV/CAC (Federal PKI) + OIDC (Login.gov)
```

## Key Design Decisions

### 1. Native Deployment (No Docker)

- **Frontend:** Static files on S3 + CloudFront
- **Backend:** Python platform on Elastic Beanstalk
- **Why:** Simpler for government compliance, no container registry needed

### 2. Elastic Beanstalk for Django

- Fast deploys (3-5 minutes with `eb deploy`)
- Native nginx integration for PIV certificate extraction
- Auto-scaling and health monitoring built-in
- Lower cost than ECS Fargate (~$30/mo vs ~$70/mo)

### 3. Aurora Serverless v2

- Auto-scales from 0.5 to 4 ACU based on load
- Scales down when idle (cost optimization)
- PostgreSQL 15.4 with pg_cron for background jobs
- Multi-AZ for high availability

### 4. PostgreSQL-First Architecture

**Redis is DISABLED by default.** Use PostgreSQL for:

- Sessions: `django.contrib.sessions.backends.db`
- Cache: UNLOGGED tables
- Background jobs: pg_cron extension
- Full-text search: pg_trgm extension
- Pub/Sub: LISTEN/NOTIFY

Enable Redis only after measuring actual need.

### 5. ALB Mutual TLS for PIV

- ALB terminates mTLS and validates certificate chain
- Trust store: Federal Common Policy CA
- nginx extracts certificate to X-Client-Cert header
- Django middleware validates policy OIDs and creates user

### 6. Terraform for Infrastructure, EB CLI for App

- **Terraform:** VPC, Aurora, S3, CloudFront (deploy rarely)
- **EB CLI:** Application code (deploy frequently)
- **Separation:** Infrastructure changes don't require app deploys

## Cost Estimate

**Monthly:** ~$183 (dev/staging), ~$250 (prod with higher instance counts)

| Component            | Cost  | Optimization                |
| -------------------- | ----- | --------------------------- |
| NAT Gateway (2 AZ)   | $65   | Use 1 for dev (-$30)        |
| Aurora Serverless v2 | $43   | Scales to 0.5 ACU when idle |
| EB (2x t3.small)     | $30   | Use t3.micro for dev (-$15) |
| ALB                  | $23   | Required for mTLS           |
| CloudFront (3)       | $5    | Pay-as-you-go               |
| S3 + Secrets         | $5.50 | Minimal                     |
| Redis                | $0    | **Disabled**                |

## Security Checklist

- ✅ Encryption at rest (Aurora, S3)
- ✅ Encryption in transit (TLS 1.2+)
- ✅ Network segmentation (public/private subnets)
- ✅ PIV/CAC authentication (Federal PKI)
- ✅ Audit logging (CloudWatch)
- ✅ Security headers (CloudFront)
- ✅ No public database access
- ✅ IAM roles (no static credentials)

**Still needed for ATO:**

- VPC Flow Logs
- CloudTrail (organization-level)
- AWS Config
- PIV revocation checking

## Troubleshooting

### Backend not responding

```bash
eb health                          # Check environment health
eb logs                            # View application logs
eb ssh                             # SSH to instance

# Test database connectivity
psql -h <aurora-endpoint> -U plane_admin -d plane
```

### Frontend not loading

```bash
# Check CloudFront distribution status
aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Treasury Plane - Web App'].Status"

# Test direct S3 access (should fail - private bucket)
aws s3 ls s3://treasury-plane-web-frontend/

# Test CloudFront URL directly
curl -I https://<cloudfront-domain>/
```

### PIV authentication fails

```bash
# Verify trust store
aws elbv2 describe-trust-stores
aws elbv2 describe-trust-store-associations

# Check ALB logs for mTLS errors
aws s3 sync s3://treasury-plane-alb-logs/ ./alb-logs/
grep "mTLS" ./alb-logs/*.log

# Test with self-signed cert
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout test.key -out test.crt -days 1 \
  -subj "/CN=Test/emailAddress=test@treasury.gov"

curl -v --cert test.crt --key test.key \
  https://api.plane.treasury.gov/api/health/
```

### Deployment fails

```bash
# Check Terraform state
cd terraform
terraform plan                     # Should show no changes if clean

# Check EB environment
eb status
eb health

# View recent changes
eb appversion lifecycle

# Rollback if needed
eb deploy --version <previous-version>
```

## Monitoring

### Key Metrics to Watch

```bash
# EB instance CPU
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElasticBeanstalk \
  --metric-name CPUUtilization \
  --dimensions Name=EnvironmentName,Value=treasury-plane-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average

# Aurora capacity units
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=treasury-plane-aurora \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average

# ALB target response time
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/treasury-plane-alb/xxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

### Recommended Alarms

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name treasury-plane-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ElasticBeanstalk \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=EnvironmentName,Value=treasury-plane-dev

# Create alarm for 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name treasury-plane-5xx-errors \
  --alarm-description "Alert on 5xx errors" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# Create alarm for Aurora max capacity
aws cloudwatch put-metric-alarm \
  --alarm-name treasury-plane-aurora-max-capacity \
  --alarm-description "Alert when Aurora at max capacity" \
  --metric-name ServerlessDatabaseCapacity \
  --namespace AWS/RDS \
  --statistic Average \
  --period 600 \
  --evaluation-periods 2 \
  --threshold 3.8 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBClusterIdentifier,Value=treasury-plane-aurora
```

## Scaling

### Manual Scaling

```bash
# Scale EB environment
eb scale 4

# Or update Terraform
# In terraform.tfvars:
eb_min_instances = 4
eb_max_instances = 8

# Apply
cd terraform
terraform apply
```

### Auto Scaling Triggers

Elastic Beanstalk auto-scales based on:

- CPU utilization (target: 70%)
- Network in/out
- Request count

Aurora auto-scales based on:

- CPU utilization
- Active connections
- Query volume

## Maintenance

### Database Migrations

```bash
# SSH to EB instance
eb ssh

# Activate Python virtual environment
source /var/app/venv/*/bin/activate
cd /var/app/current

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Exit
exit
```

### Update Python Dependencies

```bash
# In backend/requirements.txt, update versions
# Then deploy:
eb deploy

# EB automatically runs:
# - pip install -r requirements.txt
# - python manage.py collectstatic
```

### Rotate Secrets

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update in Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id treasury-plane/django-secret-key \
  --secret-string "$NEW_SECRET"

# Restart EB environment
eb restart
```

### Update Federal PKI Trust Store

```bash
# Download latest cert bundle
curl -o federal-common-policy-ca.pem \
  https://repo.fpki.gov/bridge/caCertsIssuedTofbca.p7b

# Upload to S3
aws s3 cp federal-common-policy-ca.pem \
  s3://treasury-piv-trust-store/

# Update ALB trust store
TRUST_STORE_ARN=$(cd terraform && terraform output -raw piv_trust_store_arn)
aws elbv2 modify-trust-store \
  --trust-store-arn "$TRUST_STORE_ARN" \
  --ca-certificates-bundle-s3-bucket treasury-piv-trust-store \
  --ca-certificates-bundle-s3-key federal-common-policy-ca.pem
```

## Backup and Recovery

### Create Manual Snapshot

```bash
# Aurora snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier treasury-plane-aurora \
  --db-cluster-snapshot-identifier plane-manual-$(date +%Y%m%d-%H%M%S)

# S3 versioning (already enabled)
aws s3api list-object-versions \
  --bucket treasury-plane-web-frontend \
  --prefix index.html
```

### Restore from Snapshot

```bash
# List available snapshots
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier treasury-plane-aurora

# Restore to new cluster
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier treasury-plane-aurora-restored \
  --snapshot-identifier plane-manual-20240101-120000 \
  --engine aurora-postgresql \
  --engine-version 15.4

# Update Terraform to point to new cluster
# (or manually update Django DATABASE_URL)
```

## Useful Links

- **AWS Console:** https://console.aws.amazon.com/
- **EB Console:** https://console.aws.amazon.com/elasticbeanstalk/
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/
- **Secrets Manager:** https://console.aws.amazon.com/secretsmanager/
- **Federal PKI:** https://playbooks.idmanagement.gov/fpki/
- **Login.gov Dashboard:** https://dashboard.int.identitysandbox.gov/

## Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Complete deployment walkthrough
- [Architecture](docs/ARCHITECTURE.md) - Detailed architecture diagrams
- [PIV Authentication](docs/PIV_AUTHENTICATION.md) - PIV/CAC implementation
- [Terraform README](terraform/README.md) - Infrastructure configuration

## Support

For issues:

1. Check CloudWatch Logs
2. Review EB environment health
3. Test database connectivity
4. Verify security group rules
5. Check Secrets Manager access

For PIV issues:

1. Verify ALB trust store contains Federal PKI
2. Check nginx configuration extracts certificate
3. Review Django middleware logs
4. Test with self-signed cert first

For OIDC issues:

1. Verify Login.gov client credentials
2. Check redirect URIs match configuration
3. Review OIDC provider endpoints
4. Test token exchange manually
