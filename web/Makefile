.PHONY: dev prod down logs clean db-shell migrate help

# Default target
help:
	@echo "TrainForge Docker Commands"
	@echo ""
	@echo "  make dev      - Start development environment (hot-reload)"
	@echo "  make prod     - Start production environment"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - View all logs"
	@echo "  make clean    - Stop and remove all data (including database)"
	@echo "  make db-shell - Open PostgreSQL shell"
	@echo "  make migrate  - Run database migrations"
	@echo ""

# Development mode with hot-reloading
dev:
	docker compose -f docker-compose.dev.yml up

# Production mode
prod:
	docker compose up --build

# Stop all services
down:
	docker compose -f docker-compose.dev.yml down
	docker compose down

# View logs
logs:
	docker compose -f docker-compose.dev.yml logs -f

# Clean everything (including database volumes)
clean:
	docker compose -f docker-compose.dev.yml down -v
	docker compose down -v
	docker system prune -f

# Database shell
db-shell:
	docker compose exec db psql -U trainforge -d trainforge

# Run migrations
migrate:
	docker compose exec backend alembic upgrade head
