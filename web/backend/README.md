# TrainForge Backend

FastAPI backend for the TrainForge ML training platform.

## Features

- GitHub App OAuth flow for authentication
- Installation and repository management
- Workflow triggering via GitHub Actions API
- Webhook handling for real-time job status updates
- PostgreSQL database with SQLAlchemy ORM
- Alembic migrations for database versioning

## Project Structure

```
backend/
├── alembic/              # Database migrations
│   ├── versions/         # Migration files
│   ├── env.py           # Alembic environment
│   └── script.py.mako   # Migration template
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── config.py        # Settings management
│   ├── database.py      # SQLAlchemy setup
│   ├── github.py        # GitHub API utilities
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   └── routes/
│       ├── __init__.py
│       ├── auth.py      # OAuth endpoints
│       ├── repos.py     # Repository management
│       ├── workflows.py # Training job management
│       └── webhook.py   # GitHub webhook handler
├── alembic.ini          # Alembic configuration
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
└── README.md
```

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 14+ (or use SQLite for development)
- GitHub App created (see GitHub App Setup below)

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (see .env.example)
cp .env.example .env
# Edit .env with your values

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Quick Start (SQLite for Development)

For quick local development, you can use SQLite:

```bash
# In .env, set:
DATABASE_URL=sqlite:///./trainforge.db
```

## GitHub App Setup

1. Go to GitHub Settings > Developer Settings > GitHub Apps
2. Click "New GitHub App"
3. Configure:

   - **Name**: TrainForge (or your preferred name)
   - **Homepage URL**: Your frontend URL
   - **Callback URL**: `http://localhost:3000/setup/callback`
   - **Setup URL**: `http://localhost:3000/setup`
   - **Webhook URL**: `http://your-backend-url/api/webhooks/github`
   - **Webhook Secret**: Generate a secure random string

4. Permissions:
   - **Repository**: Contents (Read & Write), Actions (Read & Write), Metadata (Read)
5. Subscribe to events:

   - Installation
   - Workflow run
   - Repository

6. After creating, note down:
   - App ID
   - Client ID
   - Generate and download the private key
   - Generate a client secret

## Environment Variables

| Variable                 | Description                                          | Required    |
| ------------------------ | ---------------------------------------------------- | ----------- |
| `DATABASE_URL`           | PostgreSQL connection string                         | Yes         |
| `GITHUB_APP_ID`          | GitHub App ID                                        | Yes         |
| `GITHUB_APP_SLUG`        | GitHub App URL slug (name in lowercase with hyphens) | Yes         |
| `GITHUB_CLIENT_ID`       | GitHub App OAuth Client ID                           | Yes         |
| `GITHUB_CLIENT_SECRET`   | GitHub App OAuth Client Secret                       | Yes         |
| `GITHUB_APP_PRIVATE_KEY` | Contents of the .pem file                            | Yes         |
| `GITHUB_WEBHOOK_SECRET`  | Webhook secret for signature verification            | Recommended |
| `FRONTEND_URL`           | Frontend URL for CORS and redirects                  | Yes         |
| `SECRET_KEY`             | Secret key for session management                    | Yes         |

## API Endpoints

### Authentication

- `GET /api/auth/login` - Get GitHub OAuth URL
- `GET /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/install-url` - Get GitHub App install URL
- `POST /api/auth/installations` - Register new installation
- `GET /api/auth/installations/{id}` - Get installation details
- `DELETE /api/auth/installations/{id}` - Deactivate installation

### Repositories

- `GET /api/repos/{installation_id}` - List repositories
- `GET /api/repos/{installation_id}/{owner}/{repo}` - Get repository
- `POST /api/repos/{installation_id}/{owner}/{repo}/setup-workflow` - Add workflow file

### Workflows

- `GET /api/workflows/templates` - List training templates
- `GET /api/workflows/templates/{id}` - Get template details
- `POST /api/workflows/{installation_id}/{owner}/{repo}/trigger` - Start training
- `GET /api/workflows/{installation_id}/{owner}/{repo}/runs` - List runs
- `GET /api/workflows/{installation_id}/{owner}/{repo}/runs/{id}` - Get run details
- `GET /api/workflows/{installation_id}/{owner}/{repo}/runs/{id}/artifacts` - Get artifacts

### Webhooks

- `POST /api/webhooks/github` - GitHub webhook receiver

### Health

- `GET /` - Basic health check
- `GET /health` - Detailed health check

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

### Running Tests

```bash
pytest
```

### Creating Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Code Style

```bash
# Format code
black app/

# Sort imports
isort app/

# Type checking
mypy app/
```
