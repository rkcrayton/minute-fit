.PHONY: help install test test-watch coverage

help:
	@echo "Available commands:"
	@echo "  make install       Install dependencies"
	@echo "  make test          Run all Jest tests"
	@echo "  make test-watch    Run Jest in watch mode"
	@echo "  make coverage      Run tests + generate coverage report"

install:
	npm ci

test:
	npm test

test-watch:
	npm run test:watch

coverage:
	npm run test:coverage
