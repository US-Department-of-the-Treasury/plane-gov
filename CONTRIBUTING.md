# Contributing to Treasury Plane

Thank you for your interest in contributing to the Treasury fork of Plane. This guide covers how to set up your development environment and submit contributions.

## Submitting Issues

Before submitting a new issue, please search existing [issues](https://github.com/US-Department-of-the-Treasury/plane/issues) to avoid duplicates.

When creating an issue, please provide:

- Clear description of the problem or feature request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (browser, OS, etc.)

## Development Setup

### Requirements

- Node.js 20+ LTS
- Python 3.12+
- PostgreSQL 14+
- Redis 6.2+
- pnpm (package manager)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/US-Department-of-the-Treasury/plane.git
cd plane
```

2. Install frontend dependencies:

```bash
pnpm install
```

3. Set up Python environment:

```bash
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Configure environment:

```bash
cp .env.example .env
# Edit .env with your local settings
```

5. Run database migrations:

```bash
cd apps/api
python manage.py migrate
```

6. Start the development servers:

**API server:**

```bash
cd apps/api
python manage.py runserver
```

**Frontend:**

```bash
pnpm dev
```

7. Access the application:

- Frontend: http://localhost:3000
- Admin setup: http://localhost:3001/god-mode/

## Code Guidelines

### General

- Write clear, self-documenting code
- Follow existing patterns in the codebase
- Keep changes focused and minimal

### Frontend (TypeScript/React)

- We use ESLint and Prettier for code formatting
- Run `pnpm check:lint` before committing
- Run `pnpm check:types` to verify TypeScript

### Backend (Python/Django)

- Follow PEP 8 style guidelines
- Add type hints where practical
- Write tests for new functionality

## Pull Requests

1. Create a feature branch from `preview`:

```bash
git checkout preview
git pull origin preview
git checkout -b feature/your-feature-name
```

2. Make your changes and commit:

```bash
git add .
git commit -m "feat: description of change"
```

3. Push and create a PR:

```bash
git push origin feature/your-feature-name
```

4. Fill out the PR template with:

- Summary of changes
- Test plan
- Any breaking changes

## Commit Message Format

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Questions

For questions about contributing, open a GitHub issue with the `question` label.
