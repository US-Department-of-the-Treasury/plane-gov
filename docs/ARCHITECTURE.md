# Treasury Plane - AWS Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INTERNET                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS (TLS 1.3)
                             │
            ┌────────────────┴────────────────┐
            │                                  │
            ▼                                  ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│   CloudFront (3 dist.)    │     │  Application Load Balancer │
│                           │     │  - HTTPS (ACM cert)        │
│  - web.plane.treasury.gov │     │  - mTLS (PIV/CAC)          │
│  - admin.plane.treasury   │     │  - WebSocket support       │
│  - space.plane.treasury   │     │                            │
└────────────┬──────────────┘     └────────────┬───────────────┘
             │                                  │
             │ OAC                              │
             │                                  │
             ▼                                  ▼
┌───────────────────────────┐     ┌───────────────────────────────────┐
│   S3 Buckets (Private)    │     │  VPC (10.0.0.0/16)                │
│                           │     │                                   │
│  - treasury-plane-web     │     │  ┌─────────────────────────────┐ │
│  - treasury-plane-admin   │     │  │  Public Subnets (2 AZs)     │ │
│  - treasury-plane-space   │     │  │  - 10.0.1.0/24             │ │
│                           │     │  │  - 10.0.2.0/24             │ │
└───────────────────────────┘     │  │  (NAT Gateways)             │ │
                                  │  └─────────────────────────────┘ │
                                  │                │                  │
                                  │                ▼                  │
                                  │  ┌─────────────────────────────┐ │
                                  │  │  Private Subnets (2 AZs)    │ │
                                  │  │  - 10.0.10.0/24            │ │
                                  │  │  - 10.0.11.0/24            │ │
                                  │  │                             │ │
                                  │  │  ┌────────────────────────┐│ │
                                  │  │  │ Elastic Beanstalk      ││ │
                                  │  │  │ - Python 3.11 Platform ││ │
                                  │  │  │ - nginx → Gunicorn     ││ │
                                  │  │  │ - nginx → Daphne (WS)  ││ │
                                  │  │  │ - Auto Scaling (2-4)   ││ │
                                  │  │  └────────────────────────┘│ │
                                  │  │             │               │ │
                                  │  │             ▼               │ │
                                  │  │  ┌────────────────────────┐│ │
                                  │  │  │ Aurora Serverless v2   ││ │
                                  │  │  │ - PostgreSQL 15.4      ││ │
                                  │  │  │ - 0.5-4 ACU scaling    ││ │
                                  │  │  │ - Multi-AZ             ││ │
                                  │  │  │ - Encrypted            ││ │
                                  │  │  └────────────────────────┘│ │
                                  │  │                             │ │
                                  │  │  ┌────────────────────────┐│ │
                                  │  │  │ ElastiCache Redis      ││ │
                                  │  │  │ (Optional - disabled)  ││ │
                                  │  │  │ Use PostgreSQL first   ││ │
                                  │  │  └────────────────────────┘│ │
                                  │  └─────────────────────────────┘ │
                                  └───────────────────────────────────┘
```

## Authentication Flow

### PIV/CAC Authentication

```
┌─────────┐         ┌─────────┐         ┌─────────┐         ┌─────────┐
│ Browser │         │   ALB   │         │  nginx  │         │ Django  │
│ (PIV)   │         │ (mTLS)  │         │         │         │ App     │
└────┬────┘         └────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │                   │
     │ 1. HTTPS + Cert   │                   │                   │
     ├──────────────────►│                   │                   │
     │                   │                   │                   │
     │                   │ 2. Validate cert  │                   │
     │                   │    - Chain        │                   │
     │                   │    - Expiration   │                   │
     │                   │    - Trust Store  │                   │
     │                   │                   │                   │
     │                   │ 3. Forward cert   │                   │
     │                   │    (X-Amzn-Mtls)  │                   │
     │                   ├──────────────────►│                   │
     │                   │                   │                   │
     │                   │                   │ 4. Extract cert   │
     │                   │                   │    to X-Client-Cert
     │                   │                   ├──────────────────►│
     │                   │                   │                   │
     │                   │                   │                   │ 5. Validate
     │                   │                   │                   │    - Policy OID
     │                   │                   │                   │    - Subject fields
     │                   │                   │                   │
     │                   │                   │                   │ 6. Get/create user
     │                   │                   │                   │
     │                   │                   │ 7. Response       │
     │                   │                   │◄──────────────────┤
     │                   │                   │                   │
     │                   │ 8. Response       │                   │
     │                   │◄──────────────────┤                   │
     │                   │                   │                   │
     │ 9. User data      │                   │                   │
     │◄──────────────────┤                   │                   │
     │                   │                   │                   │
```

### OIDC Authentication (Login.gov)

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Browser │      │ Django  │      │Login.gov│      │ Django  │
│         │      │ App     │      │  IdP    │      │ Backend │
└────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘
     │                │                │                │
     │ 1. Login       │                │                │
     ├───────────────►│                │                │
     │                │                │                │
     │                │ 2. Redirect to │                │
     │                │    Login.gov   │                │
     │◄───────────────┤                │                │
     │                │                │                │
     │ 3. Auth prompt │                │                │
     ├───────────────────────────────►│                │
     │                │                │                │
     │                │ 4. Callback    │                │
     │◄───────────────────────────────┤                │
     │                │                │                │
     │ 5. Auth code   │                │                │
     ├───────────────►│                │                │
     │                │                │                │
     │                │ 6. Exchange    │                │
     │                │    code for    │                │
     │                │    token       │                │
     │                ├───────────────►│                │
     │                │                │                │
     │                │ 7. ID token    │                │
     │                │◄───────────────┤                │
     │                │                │                │
     │                │ 8. Get user    │                │
     │                │    info        │                │
     │                ├───────────────►│                │
     │                │                │                │
     │                │ 9. User attrs  │                │
     │                │◄───────────────┤                │
     │                │                │                │
     │                │ 10. Create     │                │
     │                │     session    │                │
     │                │                │                │
     │ 11. Logged in  │                │                │
     │◄───────────────┤                │                │
     │                │                │                │
```

## Network Architecture

### VPC Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ VPC: 10.0.0.0/16                                                    │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ us-east-1a                                                      ││
│ │                                                                 ││
│ │ ┌──────────────────┐          ┌──────────────────────────────┐ ││
│ │ │ Public Subnet    │          │ Private Subnet               │ ││
│ │ │ 10.0.1.0/24      │          │ 10.0.10.0/24                 │ ││
│ │ │                  │          │                              │ ││
│ │ │ - ALB            │          │ - EB Instance 1              │ ││
│ │ │ - NAT Gateway 1  │◄─────────│ - Aurora Primary             │ ││
│ │ │                  │          │                              │ ││
│ │ └──────────────────┘          └──────────────────────────────┘ ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ us-east-1b                                                      ││
│ │                                                                 ││
│ │ ┌──────────────────┐          ┌──────────────────────────────┐ ││
│ │ │ Public Subnet    │          │ Private Subnet               │ ││
│ │ │ 10.0.2.0/24      │          │ 10.0.11.0/24                 │ ││
│ │ │                  │          │                              │ ││
│ │ │ - ALB            │          │ - EB Instance 2              │ ││
│ │ │ - NAT Gateway 2  │◄─────────│ - Aurora Replica             │ ││
│ │ │                  │          │ - ElastiCache (optional)     │ ││
│ │ └──────────────────┘          └──────────────────────────────┘ ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Security Groups

```
┌─────────────────────────────────────────────────────────────────────┐
│ ALB Security Group                                                  │
│ Ingress:                                                            │
│   - 0.0.0.0/0 → 443 (HTTPS)                                         │
│   - 0.0.0.0/0 → 80  (HTTP → redirect)                               │
│ Egress:                                                             │
│   - All                                                             │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ EB Security Group                                                   │
│ Ingress:                                                            │
│   - ALB SG → 80 (HTTP)                                              │
│   - VPC CIDR → 22 (SSH for troubleshooting)                         │
│ Egress:                                                             │
│   - All (for NAT Gateway → internet)                                │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│ Aurora Security Group   │ │ Redis Security Group    │
│ Ingress:                │ │ Ingress:                │
│   - EB SG → 5432        │ │   - EB SG → 6379        │
│ Egress:                 │ │ Egress:                 │
│   - None                │ │   - None                │
└─────────────────────────┘ └─────────────────────────┘
```

## Data Flow

### API Request Flow

```
1. User → CloudFront → S3 (React app loads)
2. React → ALB:443 (API request with PIV cert)
3. ALB → nginx:80 (validates cert, forwards to nginx)
4. nginx → Gunicorn:8000 (HTTP proxy with X-Client-Cert header)
5. Gunicorn → Django (PIV middleware authenticates)
6. Django → Aurora:5432 (database query)
7. Aurora → Django (result)
8. Django → Gunicorn → nginx → ALB → CloudFront → User
```

### WebSocket Connection Flow

```
1. React → ALB:443 (WebSocket upgrade request)
2. ALB → nginx:80 (Connection: upgrade)
3. nginx → Daphne:9000 (WebSocket proxy)
4. Daphne → Django Channels (ASGI)
5. Django Channels → Aurora/Redis (channel layer)
6. Persistent bidirectional connection maintained
```

## Secrets Management

```
┌─────────────────────────────────────────────────────────────────────┐
│ AWS Secrets Manager                                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ treasury-plane/db-credentials                               │   │
│  │ {username, password, host, port, dbname}                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ treasury-plane/django-secret-key                            │   │
│  │ "random-50-char-string..."                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ treasury-plane/oidc-credentials                             │   │
│  │ {client_id, client_secret, issuer, endpoints...}            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ treasury-plane/app-config                                   │   │
│  │ {ENVIRONMENT, DEBUG, ALLOWED_HOSTS, CORS_ORIGINS...}        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ treasury-plane/redis-config (optional)                      │   │
│  │ {primary_endpoint, reader_endpoint, port}                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ IAM Role
                                │ (secretsmanager:GetSecretValue)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Elastic Beanstalk EC2 Instances                                     │
│                                                                     │
│  Django app fetches secrets at runtime via boto3                   │
└─────────────────────────────────────────────────────────────────────┘
```

## PostgreSQL-First Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Aurora PostgreSQL 15.4                                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Application Tables                                           │  │
│  │ - users, projects, issues, comments, etc.                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Session Storage (Django)                                     │  │
│  │ - django_session table                                       │  │
│  │ - Instead of Redis for sessions                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Cache (UNLOGGED tables)                                      │  │
│  │ - cache_table (for Django cache backend)                    │  │
│  │ - No write-ahead log = faster writes                         │  │
│  │ - Instead of Redis for caching                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Background Jobs (pg_cron extension)                          │  │
│  │ - Scheduled cleanup tasks                                    │  │
│  │ - Email digests                                              │  │
│  │ - Instead of Celery + Redis                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Full-Text Search (pg_trgm extension)                         │  │
│  │ - Fuzzy search with similarity()                             │  │
│  │ - GIN indexes for autocomplete                               │  │
│  │ - Instead of Elasticsearch                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ JSONB Columns                                                │  │
│  │ - Flexible metadata storage                                  │  │
│  │ - GIN indexes for queries                                    │  │
│  │ - Instead of MongoDB                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

Note: Add Redis only if PostgreSQL alternatives don't meet measured requirements
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Developer Workstation                                               │
│                                                                     │
│  ┌──────────────────────┐         ┌──────────────────────────┐     │
│  │ Terraform CLI        │         │ AWS CLI                  │     │
│  │ - terraform init     │         │ - aws s3 sync            │     │
│  │ - terraform apply    │         │ - aws cloudfront ...     │     │
│  └──────────────────────┘         └──────────────────────────┘     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ EB CLI                                                       │  │
│  │ - eb init                                                    │  │
│  │ - eb deploy (fast, ~3-5 minutes)                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ AWS                                                                 │
│                                                                     │
│  Infrastructure (Terraform - deploy rarely)                        │
│  ├─ VPC, subnets, security groups                                  │
│  ├─ Aurora cluster                                                 │
│  ├─ ALB with mTLS                                                  │
│  ├─ S3 buckets, CloudFront distributions                           │
│  └─ Secrets Manager, IAM roles                                     │
│                                                                     │
│  Application (EB CLI - deploy frequently)                          │
│  ├─ Django code                                                    │
│  ├─ Python dependencies                                            │
│  ├─ .ebextensions configuration                                    │
│  └─ .platform hooks                                                │
│                                                                     │
│  Frontend (npm + aws cli - deploy frequently)                      │
│  ├─ Build React apps                                               │
│  ├─ Upload to S3                                                   │
│  └─ Invalidate CloudFront                                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Cost Breakdown

```
┌─────────────────────────────────────────────────────────────────────┐
│ Monthly Cost Estimate: ~$183                                       │
│                                                                     │
│  NAT Gateway (2 AZs)            $65  ████████████████████          │
│  Aurora Serverless v2           $43  ██████████████                │
│  Elastic Beanstalk (2 t3.small) $30  █████████                     │
│  Application Load Balancer      $23  ███████                       │
│  ElastiCache Redis              $0   (disabled)                    │
│  CloudFront (3 distributions)   $5   ██                            │
│  S3 Storage                     $3   █                             │
│  Secrets Manager (5 secrets)    $2.50 █                            │
│  Data Transfer                  ~$10  ███                          │
│                                                                     │
│ Optimization opportunities:                                         │
│  - Use 1 NAT Gateway for dev: -$30/mo                              │
│  - Use t3.micro instances: -$15/mo                                 │
│  - Add VPC endpoints for AWS APIs: -$5-10/mo in data transfer      │
└─────────────────────────────────────────────────────────────────────┘
```

## Scaling Characteristics

```
Component             Current       Scale To        Method
─────────────────────────────────────────────────────────────────────
EB Instances          2-4           Up to 100       Auto Scaling Group
Aurora ACU            0.5-4         Up to 128       Serverless v2 auto
ALB                   N/A           Millions/sec    AWS managed
CloudFront            N/A           Unlimited       AWS managed
S3                    N/A           Unlimited       AWS managed

Bottleneck Analysis:
1. Database connections (~5000 max with default settings)
2. EB instance count (limited by AWS service quotas)
3. ALB target group deregistration delay (30s during deploys)
```

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ CloudWatch                                                          │
│                                                                     │
│  Logs                                                               │
│  ├─ /aws/elasticbeanstalk/treasury-plane-dev/var/log/web.stdout    │
│  ├─ /aws/elasticbeanstalk/treasury-plane-dev/var/log/nginx         │
│  ├─ /aws/rds/cluster/treasury-plane-aurora/postgresql              │
│  └─ /aws/lambda/* (if using Lambda)                                │
│                                                                     │
│  Metrics                                                            │
│  ├─ ALB: TargetResponseTime, HTTPCode_Target_5XX_Count             │
│  ├─ EB: CPUUtilization, ApplicationRequestsTotal                   │
│  ├─ Aurora: ServerlessDatabaseCapacity, DatabaseConnections        │
│  └─ CloudFront: Requests, BytesDownloaded, ErrorRate               │
│                                                                     │
│  Alarms (recommended)                                               │
│  ├─ EB CPUUtilization > 80% for 5 minutes                          │
│  ├─ ALB HTTPCode_Target_5XX_Count > 10 in 1 minute                 │
│  ├─ Aurora DatabaseConnections > 4500                              │
│  └─ Aurora ServerlessDatabaseCapacity = 4.0 for 10 minutes         │
└─────────────────────────────────────────────────────────────────────┘
```

## Disaster Recovery

```
Component           RPO           RTO           Method
─────────────────────────────────────────────────────────────────────
Aurora              1 second      1-2 minutes   Automated snapshots + failover
S3                  0 (durable)   Seconds       Versioning + cross-region
EB                  N/A           5-10 minutes  Redeploy from code
CloudFront          N/A           Instant       Edge cache survives origin failure

Backup Strategy:
- Aurora: Automated daily snapshots (7-day retention)
- S3: Versioning enabled (90-day lifecycle for old versions)
- Terraform state: S3 backend with versioning + DynamoDB locking
- Application code: Git repository (GitHub)
```

## Security Layers

```
Layer                Controls
─────────────────────────────────────────────────────────────────────
Network              - VPC isolation
                     - Private subnets for data tier
                     - Security groups (principle of least privilege)
                     - No public IPs for EB/Aurora

Transport            - TLS 1.3 (CloudFront)
                     - TLS 1.2 minimum (ALB)
                     - Mutual TLS for PIV (ALB)

Authentication       - PIV/CAC (Federal PKI)
                     - OIDC (Login.gov)
                     - Multi-factor (PIV PIN + certificate)

Authorization        - Django permissions framework
                     - Row-level security (PostgreSQL)
                     - IAM roles (AWS resources)

Data                 - Encryption at rest (Aurora KMS)
                     - Encryption at rest (S3 AES-256)
                     - Secrets Manager (KMS encrypted)

Audit                - CloudWatch Logs (90-day retention)
                     - CloudTrail (API calls)
                     - VPC Flow Logs (network traffic)
                     - Django audit logging
```

## References

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [PIV Authentication](PIV_AUTHENTICATION.md)
- [Terraform Configuration](../terraform/README.md)
