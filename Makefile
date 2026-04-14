.PHONY: help test test-v coverage test-frontend test-frontend-watch coverage-frontend dev docker-up docker-down docker-logs

help:
	@echo "Available commands:"
	@echo "  make test                  Run API tests"
	@echo "  make test-v                Run API tests (verbose)"
	@echo "  make coverage              Run API tests + generate HTML coverage report"
	@echo "  make test-frontend         Run frontend Jest tests"
	@echo "  make test-frontend-watch   Run frontend Jest tests in watch mode"
	@echo "  make coverage-frontend     Run frontend tests + generate coverage report"
	@echo "  make dev                   Start API dev server (uvicorn --reload)"
	@echo "  make docker-up             Start all services (API + DB)"
	@echo "  make docker-down           Stop all services"
	@echo "  make docker-logs           Tail logs from all services"

test:
	$(MAKE) -C apps/api test

test-v:
	$(MAKE) -C apps/api test-v

coverage:
	$(MAKE) -C apps/api coverage

test-frontend:
	$(MAKE) -C apps/mobile test

test-frontend-watch:
	$(MAKE) -C apps/mobile test-watch

coverage-frontend:
	$(MAKE) -C apps/mobile coverage

dev:
	$(MAKE) -C apps/api dev

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
