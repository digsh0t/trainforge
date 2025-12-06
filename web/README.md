# TrainForge - Docker Setup

This directory contains the Docker configuration for running the entire TrainForge stack.

## Quick Start

### 1. Create environment file

```bash
cp .env.example .env
```

Edit `.env` with your GitHub App credentials (see [GitHub App Setup](#github-app-setup) below).

### 2. Run with Docker Compose

**Development mode** (with hot-reloading):

```bash
docker-compose -f docker-compose.dev.yml up
```

**Production mode**:

```bash
docker-compose up --build
```

### 3. Access the application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432

## Services

| Service    | Port | Description             |
| ---------- | ---- | ----------------------- |
| `frontend` | 3000 | Next.js web application |
| `backend`  | 8000 | FastAPI REST API        |
| `db`       | 5432 | PostgreSQL database     |

## Commands

### Start all services

```bash
docker-compose up
```

### Start in background

```bash
docker-compose up -d
```

### View logs

```bash
docker-compose logs -f

# Or for a specific service
docker-compose logs -f backend
```

### Stop all services

```bash
docker-compose down
```

### Stop and remove volumes (reset database)

```bash
docker-compose down -v
```

### Rebuild containers

```bash
docker-compose up --build
```

### Run database migrations manually

```bash
docker-compose exec backend alembic upgrade head
```

### Access database shell

```bash
docker-compose exec db psql -U trainforge -d trainforge
```

## GitHub App Setup

To use TrainForge, you need to create a GitHub App:

1. Go to https://github.com/settings/apps/new
2. Fill in the following:
   - **GitHub App name**: TrainForge (or your preferred name)
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `http://localhost:3000/setup/callback`
   - **Webhook URL**: `http://localhost:8000/api/webhook` (or disable for local dev)
   - **Webhook secret**: Generate a random string
3. Set permissions:
   - **Repository permissions**:
     - Contents: Read & write
     - Actions: Read & write
     - Metadata: Read-only
4. After creation, note down:

   - App ID
   - Client ID
   - Generate a Client Secret
   - Generate a Private Key (download the .pem file)

5. Add these to your `.env` file

## Development vs Production

### Development (`docker-compose.dev.yml`)

- Hot-reloading enabled for both frontend and backend
- Source code mounted as volumes
- Uses `npm run dev` for frontend
- Uses `uvicorn --reload` for backend

### Production (`docker-compose.yml`)

- Optimized builds
- No source code mounting
- Uses Next.js standalone output
- No hot-reloading

## Troubleshooting

### Database connection issues

```bash
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs db
```

### Reset everything

```bash
docker-compose down -v
docker system prune -f
docker-compose up --build
```

### Check backend logs

```bash
docker-compose logs -f backend
```

### Port already in use

```bash
# Find what's using the port
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Kill the process
kill -9 <PID>
```
