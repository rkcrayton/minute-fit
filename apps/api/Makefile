PYTHON = .venv/bin/python
PIP    = .venv/bin/pip

.PHONY: help install install-test test test-v coverage dev

help:
	@echo "Available commands:"
	@echo "  make install       Install app dependencies"
	@echo "  make install-test  Install test dependencies"
	@echo "  make test          Run all tests"
	@echo "  make test-v        Run tests (verbose)"
	@echo "  make coverage      Run tests + generate HTML coverage report"
	@echo "  make dev           Start dev server (uvicorn --reload)"

install:
	$(PIP) install -r requirements.txt

install-test:
	$(PIP) install -r requirements-test.txt

test:
	$(PYTHON) -m pytest tests/

test-v:
	$(PYTHON) -m pytest tests/ -v

coverage:
	$(PYTHON) -m pytest tests/ --cov-report=html
	@echo "Coverage report written to: apps/api/htmlcov/index.html"

dev:
	cd app && ../$(PYTHON) -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
