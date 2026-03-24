.PHONY: help test test-v coverage dev docker-up docker-down docker-logs

help:
	@echo "Available commands:"
	@echo "  make test          Run API tests"
	@echo "  make test-v        Run API tests (verbose)"
	@echo "  make coverage      Run tests + generate HTML coverage report"
	@echo "  make dev           Start API dev server (uvicorn --reload)"
	@echo "  make docker-up     Start all services (API + DB)"
	@echo "  make docker-down   Stop all services"
	@echo "  make docker-logs   Tail logs from all services"

test:
	$(MAKE) -C apps/api test

test-v:
	$(MAKE) -C apps/api test-v

coverage:
	$(MAKE) -C apps/api coverage

dev:
	$(MAKE) -C apps/api dev

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
