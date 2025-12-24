---
title: SSM Parameter Store Integration with Elastic Beanstalk ebextensions
category: infrastructure-issues
tags:
  - elastic-beanstalk
  - ssm-parameter-store
  - ebextensions
  - bash-scripting
  - iam-permissions
severity: high
symptoms:
  - ebextensions commands succeed but don't set environment variables
  - Bash scripts exit silently without executing error handlers
  - IAM GetParametersByPath returns empty results despite correct path
  - Environment variables not populated in /opt/elasticbeanstalk/deployment/env
root_cause: Multiple issues - set -e with command substitution, IAM permissions requiring both path and wildcard, bash error handling in ebextensions
date_solved: 2025-12-23
---

# SSM Parameter Store Integration with Elastic Beanstalk ebextensions

## Overview

When migrating from AWS Secrets Manager to SSM Parameter Store for Elastic Beanstalk environment variables, several non-obvious gotchas can cause silent failures during deployment.

## Issue 1: `set -e` Breaks Error Handling in ebextensions

### Symptom

Container commands in `.ebextensions/00-validate.config` appear to succeed (exit 0) but don't execute the actual validation logic. Environment variables are not set, but the deployment continues without error.

### Root Cause

**`set -e` combined with command substitution causes immediate script exit**, preventing the `$?` exit code from being captured:

```bash
#!/bin/bash
set -e  # Exit immediately on any error

# This FAILS SILENTLY - script exits before checking $?
RESULT=$(aws ssm get-parameters-by-path --path /nonexistent 2>&1)
EXIT_CODE=$?  # This line NEVER EXECUTES because script already exited

if [ $EXIT_CODE -ne 0 ]; then
    echo "This error handler never runs"
    exit 1
fi
```

When `aws ssm get-parameters-by-path` fails inside command substitution with `set -e`, the subshell exits with non-zero, which triggers the parent shell's `set -e` to exit immediately. The `EXIT_CODE=$?` assignment never happens.

### Solution

**Remove `set -e` entirely and use explicit error checking after each command:**

```bash
#!/bin/bash
# DO NOT use set -e with command substitution

RESULT=$(aws ssm get-parameters-by-path \
    --path "/${PROJECT}/${ENVIRONMENT}" \
    --recursive \
    --with-decryption \
    --region us-east-1 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: Failed to fetch parameters from SSM Parameter Store"
    echo "Path: /${PROJECT}/${ENVIRONMENT}"
    echo "Response: $RESULT"
    exit 1
fi

# Continue processing...
```

### Why This Works

- Without `set -e`, the script continues executing after the command substitution
- `EXIT_CODE=$?` correctly captures the exit status of the subshell
- Explicit `if [ $EXIT_CODE -ne 0 ]` provides controlled error handling
- Error messages are logged before exit

### How to Verify

Test your ebextensions script locally:

```bash
# Simulate the ebextensions environment
export PROJECT=plane
export ENVIRONMENT=dev

# Run the script - should fail gracefully with error message
bash .ebextensions/scripts/fetch-ssm-params.sh
```

Expected output on failure:

```
ERROR: Failed to fetch parameters from SSM Parameter Store
Path: /plane/dev
Response: An error occurred (AccessDeniedException) when calling...
```

## Issue 2: IAM Permissions for GetParametersByPath

### Symptom

`aws ssm get-parameters-by-path` returns empty results:

```json
{
  "Parameters": []
}
```

Even though:

- Parameters exist at the path in SSM Parameter Store console
- IAM policy includes `ssm:GetParametersByPath` action
- Path format appears correct

### Root Cause

**IAM policies for `GetParametersByPath` require BOTH the path and wildcard pattern:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParametersByPath"],
      "Resource": ["arn:aws:ssm:${region}:${account_id}:parameter/plane/dev"]
    }
  ]
}
```

This policy **does not work** because it only grants permission to the path itself, not the parameters under it.

### Solution

**Add wildcard pattern to grant access to parameters under the path:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"],
      "Resource": [
        "arn:aws:ssm:${region}:${account_id}:parameter/plane/dev",
        "arn:aws:ssm:${region}:${account_id}:parameter/plane/dev/*"
      ]
    }
  ]
}
```

### Why This Works

- First resource grants permission to **read the path hierarchy** (`/plane/dev`)
- Second resource with `/*` grants permission to **read individual parameters** under the path
- Without the wildcard, the API can access the path structure but not retrieve parameter values

### How to Verify

Test IAM permissions from an EC2 instance with the IAM role:

```bash
# Should return parameters (not empty array)
aws ssm get-parameters-by-path \
    --path "/plane/dev" \
    --recursive \
    --with-decryption \
    --region us-east-1

# Expected successful output:
{
    "Parameters": [
        {
            "Name": "/plane/dev/database-host",
            "Type": "String",
            "Value": "plane-db.xxxxx.us-east-1.rds.amazonaws.com",
            ...
        }
    ]
}
```

## Issue 3: SSM Parameter Naming Convention

### Pattern

Use hierarchical paths with consistent naming:

```
/{project}/{environment}/{parameter-name}
```

**Examples:**

```
/plane/dev/database-host
/plane/dev/database-password
/plane/dev/redis-url
/plane/prod/database-host
```

**Conversion to Environment Variables:**

Parameters are converted from kebab-case to UPPER_SNAKE_CASE at runtime:

| SSM Parameter Name             | Environment Variable |
| ------------------------------ | -------------------- |
| `/plane/dev/database-host`     | `DATABASE_HOST`      |
| `/plane/dev/database-password` | `DATABASE_PASSWORD`  |
| `/plane/dev/redis-url`         | `REDIS_URL`          |

### Implementation

```bash
# Fetch all parameters under /{PROJECT}/{ENVIRONMENT}
aws ssm get-parameters-by-path \
    --path "/${PROJECT}/${ENVIRONMENT}" \
    --recursive \
    --with-decryption \
    --region us-east-1 \
    --query 'Parameters[*].[Name,Value]' \
    --output text | \
while IFS=$'\t' read -r name value; do
    # Extract parameter name from path: /plane/dev/database-host -> database-host
    param_name=$(echo "$name" | awk -F/ '{print $NF}')

    # Convert to uppercase with underscores: database-host -> DATABASE_HOST
    env_var=$(echo "$param_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')

    # Write to environment file
    echo "${env_var}=\"${value}\"" >> /opt/elasticbeanstalk/deployment/env
done
```

### Why This Pattern

- **Hierarchical paths** enable fetching all parameters for an environment in one API call
- **Kebab-case** in SSM follows AWS naming conventions (lowercase, hyphens)
- **UPPER_SNAKE_CASE** env vars follow standard environment variable conventions
- **Automatic conversion** eliminates manual mapping and reduces errors

## Successful Pattern: Environment-Based Parameter Fetching

### Architecture

1. Pass `PROJECT` and `ENVIRONMENT` as Elastic Beanstalk environment properties
2. ebextensions script fetches all parameters from `/${PROJECT}/${ENVIRONMENT}/*`
3. Parameters are converted to environment variables at deploy time
4. Application reads standard environment variables (no AWS SDK needed in app code)

### Configuration

**Terraform (environment properties):**

```hcl
resource "aws_elastic_beanstalk_environment" "api" {
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PROJECT"
    value     = "plane"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ENVIRONMENT"
    value     = "dev"
  }
}
```

**ebextensions script (`.ebextensions/00-env.config`):**

```yaml
container_commands:
  01_fetch_ssm_params:
    command: /tmp/fetch-ssm-params.sh
    leader_only: true

files:
  "/tmp/fetch-ssm-params.sh":
    mode: "000755"
    owner: root
    group: root
    content: |
      #!/bin/bash

      # Validate required environment variables
      if [ -z "$PROJECT" ] || [ -z "$ENVIRONMENT" ]; then
          echo "ERROR: PROJECT and ENVIRONMENT must be set"
          exit 1
      fi

      # Fetch parameters from SSM
      RESULT=$(aws ssm get-parameters-by-path \
          --path "/${PROJECT}/${ENVIRONMENT}" \
          --recursive \
          --with-decryption \
          --region us-east-1 \
          --query 'Parameters[*].[Name,Value]' \
          --output text 2>&1)
      EXIT_CODE=$?

      if [ $EXIT_CODE -ne 0 ]; then
          echo "ERROR: Failed to fetch SSM parameters"
          echo "Path: /${PROJECT}/${ENVIRONMENT}"
          echo "Response: $RESULT"
          exit 1
      fi

      # Convert parameters to environment variables
      echo "$RESULT" | while IFS=$'\t' read -r name value; do
          param_name=$(echo "$name" | awk -F/ '{print $NF}')
          env_var=$(echo "$param_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
          echo "${env_var}=\"${value}\"" >> /opt/elasticbeanstalk/deployment/env
      done

      echo "Successfully fetched $(echo "$RESULT" | wc -l) parameters from SSM"
```

### Benefits

- **Single source of truth**: All secrets for an environment in one SSM path
- **No hardcoded parameter names**: Fetch all parameters automatically
- **Environment isolation**: `/plane/dev/*` and `/plane/prod/*` are separate
- **Easy onboarding**: Add new parameter in SSM, redeploy, done
- **Audit trail**: SSM Parameter Store tracks all parameter access and modifications

### Verification

```bash
# Check parameters were fetched
eb ssh -e "cat /opt/elasticbeanstalk/deployment/env | grep DATABASE"

# Expected output:
DATABASE_HOST="plane-db.xxxxx.us-east-1.rds.amazonaws.com"
DATABASE_PASSWORD="xxxxx"
DATABASE_NAME="plane"

# Test application can connect
curl -s https://api.example.com/api/instances/ | jq .
```

## Migration Checklist

When migrating from Secrets Manager to SSM Parameter Store:

- [ ] Create SSM parameters under `/{project}/{environment}/` hierarchy
- [ ] Update IAM policy with both path and wildcard (`/path` and `/path/*`)
- [ ] Remove `set -e` from ebextensions scripts
- [ ] Add explicit error checking after AWS CLI commands
- [ ] Set `PROJECT` and `ENVIRONMENT` in EB environment properties
- [ ] Test parameter fetching with `leader_only: true` (only one instance writes env file)
- [ ] Verify `/opt/elasticbeanstalk/deployment/env` contains expected variables
- [ ] Remove old Secrets Manager references from ebextensions
- [ ] Update IAM policy to remove Secrets Manager permissions
- [ ] Test full deployment end-to-end

## Related Issues

- EB Secrets Require Redeploy: See `eb-secrets-require-redeploy.md`
- CloudFront and EB deployment patterns: See `cloudfront-eb-alb-deployment-patterns.md`

## Files Involved

- `.ebextensions/00-env.config` - Fetches SSM parameters during deployment
- `terraform/iam.tf` - IAM policy for EC2 instance profile
- `terraform/elastic-beanstalk.tf` - EB environment configuration with PROJECT/ENVIRONMENT

## References

- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Elastic Beanstalk ebextensions](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebextensions.html)
- [Bash set -e behavior with command substitution](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
