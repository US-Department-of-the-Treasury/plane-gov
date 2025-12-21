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

Plane is an open-source project management tool to track issues, run cycles, and manage product roadmaps.

### Features

- **Issues** - Create and manage tasks with a rich text editor that supports file uploads. Add sub-properties and reference related issues.

- **Cycles** - Track team progress with burn-down charts and other tools.

- **Modules** - Divide complex projects into smaller, manageable modules.

- **Views** - Create filters to display relevant issues. Save and share views.

- **Pages** - Capture and organize ideas with a rich text editor. Convert notes into actionable items.

- **Analytics** - Access real-time insights across project data. Visualize trends and track progress.

## Deployment

This fork is deployed on Treasury infrastructure. See [TREASURY.md](./TREASURY.md) for deployment details.

For production AWS deployment, see the `terraform/` directory.

## Local Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup instructions.

## Tech Stack

- **Frontend**: React Router, TypeScript
- **Backend**: Django, Python
- **Database**: PostgreSQL

## Documentation

- [Treasury Deployment Guide](./TREASURY.md)
- [Upstream Plane Docs](https://docs.plane.so/) (for general feature documentation)

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting guidelines.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the [GNU Affero General Public License v3.0](./LICENSE.txt).
