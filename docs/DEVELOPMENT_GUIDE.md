# Minute Fit — Developer Guide

Welcome to **Gotta Minute Fit Lab**. This guide is written for new developers joining the project. It covers everything you need to understand the architecture, get your environment running, and contribute effectively from day one.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Prerequisites](#3-prerequisites)
4. [Environment Setup](#4-environment-setup)
5. [Running the Project](#5-running-the-project)
6. [Architecture Overview](#6-architecture-overview)
7. [Development Workflows](#7-development-workflows)
8. [Testing](#8-testing)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Project Overview

Minute Fit is a full-stack fitness application consisting of:

- A **React Native (Expo)** mobile frontend
- A **FastAPI** backend API
- A **PostgreSQL** database

The backend and database run inside Docker containers. The mobile frontend runs locally via Expo and connects to the containerized API.

---

## 2. Repository Structure

```
/
├── apps/
│   ├── api/                  # FastAPI backend
│   │   ├── app/              # Application source (mounted into Docker)
│   │   │   └── main.py       # FastAPI entrypoint
│   │   ├── Dockerfile
│   │   └── Makefile          # API-specific make targets
│   └── mobile/               # Expo React Native app
│       └── Makefile          # Frontend-specific make targets
├── docker-compose.yml        # Orchestrates API + DB services
├── Makefile                  # Root-level convenience commands
├── README.md
└── .env                      # Local environment variables (not committed)
```

> **Note:** `apps/api/app/` is volume-mounted into the running container, so changes to source files are reflected immediately without rebuilding the image.

---

## 3. Prerequisites

Install the following before getting started:

| Tool | Purpose | Notes |
|---|---|---|
| Node.js (LTS) | Frontend runtime | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm or yarn | Package management | Comes with Node.js |
| Docker Desktop | Runs API + DB | Must have Docker Compose v2 |
| Git | Version control | |
| Expo Go (optional) | Test on a real device | iOS/Android app |
| Android Studio (optional) | Android emulator | |
| Xcode (optional, macOS only) | iOS simulator | |

---

## 4. Environment Setup

### 4.1 Clone the Repository

```bash
git clone <repo-url>
cd minute-fit
```

### 4.2 Create the `.env` File

The `.env` file lives at the **repo root** and is shared by Docker Compose. It is not committed to version control — you will need to obtain a copy from a teammate or create one based on the template below.

```env
# PostgreSQL
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=minute_fit
POSTGRES_PORT=5432

# API
DATABASE_URL=postgresql://your_db_user:your_db_password@db:5432/minute_fit
SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=60
API_PORT=8080
```

> **Important:** `DATABASE_URL` uses `db` as the hostname — this is the Docker Compose service name for the database container, not `localhost`.

### 4.3 Install Frontend Dependencies

```bash
cd apps/mobile
npm install
```

---

## 5. Running the Project

### 5.1 Start Backend Services (API + Database)

From the repo root:

```bash
docker compose up --build
```

Or use the Makefile shortcut:

```bash
make docker-up
```

This starts two containers:
- `minute_fit_db` — PostgreSQL 16, exposed on the port in `POSTGRES_PORT`
- `minute_fit_api` — FastAPI app with hot reload, exposed on `API_PORT` (default `8080`)

The API waits for the database to pass a health check before starting.

To stop all services:

```bash
make docker-down
```

To tail logs:

```bash
make docker-logs
```

### 5.2 Verify the API is Running

Once containers are up, visit:

```
http://localhost:8080/docs
```

FastAPI auto-generates interactive Swagger documentation here.

### 5.3 Start the Mobile Frontend

In a separate terminal:

```bash
cd apps/mobile
npx expo start
```

Then:
- Press `a` to open the Android emulator
- Press `i` to open the iOS simulator (macOS only)
- Scan the QR code with Expo Go on a physical device

> **Tip:** If running on a physical device, your phone must be on the same Wi-Fi network as your development machine.

---

## 6. Architecture Overview

```
┌─────────────────────────┐
│   Expo React Native App  │  (runs locally via Expo)
│       apps/mobile        │
└────────────┬────────────┘
             │ HTTP requests
             ▼
┌─────────────────────────┐
│      FastAPI Backend     │  (Docker container: minute_fit_api)
│        apps/api          │  Port 8080 (configurable)
│  uvicorn --reload        │
└────────────┬────────────┘
             │ SQLAlchemy / psycopg2
             ▼
┌─────────────────────────┐
│     PostgreSQL 16        │  (Docker container: minute_fit_db)
│  Persistent volume:      │  Port 5432 (configurable)
│     pgdata               │
└─────────────────────────┘
```

### Key Design Decisions

- **Hot reload in Docker:** `apps/api/app/` is bind-mounted into the container. Uvicorn runs with `--reload`, so saving a Python file restarts the server instantly — no rebuild needed.
- **Health check dependency:** The API container will not start until Postgres passes a `pg_isready` health check. This prevents connection errors on cold starts.
- **Persistent database volume:** The `pgdata` Docker volume persists database state across `docker compose down` restarts. To fully wipe the database, run `docker compose down -v`.

---

## 7. Development Workflows

### 7.1 Making Backend Changes

1. Edit files under `apps/api/app/`
2. Uvicorn detects the change and reloads automatically
3. Check `make docker-logs` to confirm the reload succeeded

No rebuild is required for source changes. A rebuild (`docker compose up --build`) is only needed when you change the `Dockerfile` or install new Python dependencies.

### 7.2 Adding Python Dependencies

1. Add the package to the appropriate requirements file in `apps/api/`
2. Rebuild the API image:

```bash
docker compose up --build api
```

### 7.3 Resetting the Database

To wipe all data and start fresh:

```bash
docker compose down -v
docker compose up --build
```

> **Warning:** `-v` removes the `pgdata` volume permanently. All data will be lost.

### 7.4 Running the API Locally (Without Docker)

For faster iteration without Docker overhead:

```bash
make dev
```

This runs `uvicorn` directly on your machine. You will need a locally accessible Postgres instance and a correctly configured `.env` file where `DATABASE_URL` points to `localhost` instead of `db`.

---

## 8. Testing

All common test commands are available from the repo root via `make`.

### 8.1 Backend (API) Tests

| Command | Description |
|---|---|
| `make test` | Run all API tests |
| `make test-v` | Run all API tests (verbose output) |
| `make test-unit` | Run unit tests only |
| `make test-integration` | Run integration tests only |
| `make coverage` | Run tests and generate an HTML coverage report |

### 8.2 Frontend Tests

| Command | Description |
|---|---|
| `make test-frontend` | Run Jest tests once |
| `make test-frontend-watch` | Run Jest tests in watch mode |
| `make coverage-frontend` | Run tests and generate a coverage report |

### 8.3 Running Tests Inside Docker

Integration tests that require a live database should be run against the running Docker environment. Make sure `docker compose up` is running before executing `make test-integration`.

---

## 9. Troubleshooting

### API container exits immediately on startup

**Likely cause:** The database isn't ready yet, or `DATABASE_URL` is misconfigured.

- Check logs: `make docker-logs`
- Verify your `.env` file uses `db` (not `localhost`) as the database host in `DATABASE_URL`
- Confirm `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` match between the `db` and `api` service configs

### `docker compose up` fails with a port conflict

**Likely cause:** Another process is already using port `8080` or `5432`.

- Change `API_PORT` or `POSTGRES_PORT` in your `.env` file
- Or stop the conflicting process: `lsof -i :8080`

### Expo can't connect to the API from a physical device

**Likely cause:** The mobile app is pointing to `localhost`, which on a physical device refers to the phone itself, not your computer.

- Use your machine's local IP address instead (e.g., `192.168.x.x:8080`)
- Ensure both devices are on the same Wi-Fi network

### Database changes aren't being reflected

If you've made schema changes but the database container already has an existing volume:

```bash
docker compose down -v
docker compose up --build
```

This wipes the old schema and rebuilds from scratch.

### `npm install` fails in `apps/mobile`

- Ensure you're using the LTS version of Node.js (`node --version`)
- Try clearing the cache: `npm cache clean --force` then re-run `npm install`

### Hot reload isn't working for backend changes

- Confirm the file you're editing is inside `apps/api/app/` — files outside this directory are not volume-mounted
- Check that the container is running with the `--reload` flag: `docker compose logs api`
