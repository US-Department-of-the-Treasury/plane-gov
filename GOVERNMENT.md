# Government Deployment Guide

This document describes government-specific setup, configuration, and deployment workflows for Plane.

## Overview

This is a fork of [Plane](https://github.com/makeplane/plane) developed and maintained by the U.S. Department of the Treasury, available for use by any U.S. government agency. It adds federal authentication capabilities and security hardening while tracking upstream development.

## Fork Architecture

```
origin   → github.com/US-Department-of-the-Treasury/plane-gov (push here)
upstream → github.com/makeplane/plane (pull updates from here)
```

### Syncing with Upstream

```bash
# Fetch latest from upstream
git fetch upstream

# Merge upstream changes into main
git checkout main
git merge upstream/main

# Push to government fork
git push origin main
```

## Federal Authentication Features

### PIV/CAC Authentication

Federal smart card authentication using client certificates. Configuration:

```bash
# Enable PIV authentication
ENABLE_PIV_AUTH=true

# Certificate header (set by nginx/ALB after mTLS termination)
PIV_CERT_HEADER=X-Client-Cert

# PIV validation service endpoint (optional, for revocation checking)
PIV_VALIDATION_ENDPOINT=https://your-agency-piv-service.gov/validate
```

### OIDC Integration

OpenID Connect support for federal identity providers:

```bash
# Enable OIDC
ENABLE_OIDC=true

# Provider configuration
OIDC_ISSUER=https://login.gov
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
```

## Deployment

### Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+
- Redis (or use Plane's bundled instance)

### Quick Start

```bash
# Copy environment template
cp .env.example .env

# Configure agency-specific settings
# Edit .env with your values

# Start services
docker compose up -d
```

### Production Deployment

For production deployments on AWS:

1. Use Elastic Beanstalk (Docker platform) or ECS Fargate
2. Configure ALB with mTLS for PIV authentication
3. Use Aurora PostgreSQL Serverless v2 for database
4. See `terraform/` directory for infrastructure as code

## Development

### Local Development

```bash
# Install dependencies
yarn install

# Start development servers
yarn dev
```

### Running Tests

```bash
yarn test
```

### Code Style

Follow upstream Plane conventions. Government-specific code should be:

- Feature-flagged when possible (e.g., `ENABLE_PIV_AUTH`)
- Isolated in separate modules to minimize merge conflicts
- Well-documented with comments explaining federal requirements

## Contributing

### To This Fork

1. Create a feature branch from `main`
2. Make your changes
3. Submit a PR to this repository

### To Upstream Plane

For general improvements (bug fixes, non-government-specific features):

1. Create the fix in this fork first
2. Test thoroughly
3. Submit a PR to [makeplane/plane](https://github.com/makeplane/plane)
4. Reference the upstream PR in this fork

## License

This project is licensed under the [GNU Affero General Public License v3.0](./LICENSE.txt), the same license as upstream Plane.

Per AGPL requirements, source code is available at:
https://github.com/US-Department-of-the-Treasury/plane-gov

## Contact

For questions about this fork, contact the Treasury development team at opensource@treasury.gov.

For general Plane questions, see [Plane's documentation](https://docs.plane.so/) or [Discord](https://discord.com/invite/A92xrEGCge).
