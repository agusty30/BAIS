.PHONY: dev dev-services stop install build test lint typecheck db-migrate db-seed clean

# Development
dev: dev-services
	@echo "Starting BAIS development servers..."
	pnpm run dev

dev-services:
	docker compose up -d
	@echo "Waiting for PostgreSQL..."
	@until docker compose exec -T postgres pg_isready -U bais > /dev/null 2>&1; do sleep 1; done
	@echo "Services ready!"

stop:
	docker compose down

# Setup
install:
	pnpm install

build:
	pnpm run build

# Database
db-migrate:
	pnpm --filter @bais/backend run db:generate
	pnpm --filter @bais/backend run db:migrate

db-seed:
	pnpm --filter @bais/backend run db:seed

db-reset: dev-services
	docker compose exec -T postgres psql -U bais -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	$(MAKE) db-migrate
	$(MAKE) db-seed

# Quality
test:
	pnpm run test

lint:
	pnpm run lint

typecheck:
	pnpm run typecheck

# Cleanup
clean:
	rm -rf node_modules packages/*/node_modules packages/*/dist .turbo packages/*/.turbo

# Full setup from scratch
setup: install db-migrate db-seed
	@echo "BAIS setup complete! Run 'make dev' to start."
