# U.S. Department of the Treasury - Plane

> **This is the U.S. Department of the Treasury's fork of [Plane](https://github.com/makeplane/plane) for internal government use.**

|                   |                                                                  |
| ----------------- | ---------------------------------------------------------------- |
| **Upstream**      | [github.com/makeplane/plane](https://github.com/makeplane/plane) |
| **License**       | AGPL-3.0 (same as upstream)                                      |
| **Treasury Docs** | [TREASURY.md](./TREASURY.md)                                     |

## About This Fork

This is a self-hosted deployment of Plane for Treasury use. Key differences from upstream:

- **PIV/CAC Authentication** - Federal smart card authentication via client certificates
- **OIDC Integration** - OpenID Connect for Login.gov and other federal identity providers
- **Security Hardening** - Removed external telemetry, analytics, and third-party integrations
- **Native Deployment** - Simplified deployment without Docker dependencies

## About Plane

Plane is an open-source project management tool to track issues, run sprints, and manage product roadmaps.

### Features

- **Issues** - Create and manage tasks with a rich text editor that supports file uploads. Add sub-properties and reference related issues.

- **Sprints** - Track team progress with burn-down charts and other tools.

- **Modules** - Divide complex projects into smaller, manageable modules.

- **Views** - Create filters to display relevant issues. Save and share views.

- **Pages** - Capture and organize ideas with a rich text editor. Convert notes into actionable items.

- **Wiki** - Collaborative workspace-level knowledge base with real-time editing, collections, and granular access controls.

- **Analytics** - Access real-time insights across project data. Visualize trends and track progress.

## Deployment

This fork is deployed on Treasury infrastructure. See [TREASURY.md](./TREASURY.md) for deployment details.

For production AWS deployment, see the `terraform/` directory.

## Local Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup instructions.

### Prerequisites

- **Node.js 20+** and **pnpm**
- **Python 3.11+** and **pip**
- **PostgreSQL 15+** and **Redis** (or use `./scripts/local-dev-setup.sh`)
- **AWS CLI** configured with credentials

### Secrets Setup

This project uses AWS SSM Parameter Store for secrets management. No secrets are committed to git.

```bash
# First time setup (requires AWS credentials)
./scripts/setup-ssm-secrets.sh pull

# This updates .env files with secrets from SSM
```

If you're the first developer or setting up a new environment:

```bash
# Initialize default local secrets in SSM
./scripts/setup-ssm-secrets.sh init

# Then pull them locally
./scripts/setup-ssm-secrets.sh pull
```

See `docs/solutions/security/ssm-secrets-management.md` for detailed documentation.

## Tech Stack

- **Frontend**: React Router, TypeScript, TanStack Query, Zustand
- **Backend**: Django, Python
- **Database**: PostgreSQL
- **Real-time Collaboration**: Hocuspocus (WebSocket server), Yjs (CRDT), TipTap (rich text editor)
- **Cache & Pub/Sub**: Redis

## Testing

This project includes comprehensive E2E tests using Playwright.

### Quick Test Commands

```bash
# Run quick smoke tests (~2 minutes)
pnpm test:smoke

# Run full E2E tests (~10 minutes)
pnpm test:e2e

# Run all tests including interactions
pnpm test:comprehensive
```

**Prerequisites:** Playwright browsers must be installed once:

```bash
pnpm exec playwright install chromium
```

See [apps/web/TESTING.md](./apps/web/TESTING.md) for the complete testing guide including:

- Test structure and organization
- Writing new tests
- Debugging techniques
- CI integration
- Troubleshooting

## Documentation

- [Treasury Deployment Guide](./TREASURY.md)
- [Upstream Plane Docs](https://docs.plane.so/) (for general feature documentation)

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting guidelines.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the [GNU Affero General Public License v3.0](./LICENSE.txt).
