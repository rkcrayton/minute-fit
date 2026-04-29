# Minute-Fit Deployment Guide
### Created by Raheem Crayton
## Table of Contents

1. [Project Overview](#project-overview)
2. [Required API Keys & Secrets](#required-api-keys--secrets)
3. [Local Development Setup](#local-development-setup)
4. [Cloud Run Deployment](#cloud-run-deployment)
5. [Database Setup](#database-setup)
6. [Authentication Flow](#authentication-flow)
7. [Seeding the Exercise Library](#seeding-the-exercise-library)
8. [Mobile App Configuration](#mobile-app-configuration)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Useful Commands](#useful-commands)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

Minute-Fit is a fitness application with two components:

- **Backend API** (`apps/api/`) -- FastAPI (Python 3.11), PostgreSQL, deployed on Google Cloud Run
- **Mobile App** (`apps/mobile/`) -- React Native (Expo), iOS & Android

```
minute-fit/
  apps/
    api/          # FastAPI backend
      app/        # Application code
        routers/  # API endpoints
        models/   # SQLAlchemy ORM models
        services/ # LLM, Wger sync
      Dockerfile
      Makefile
    mobile/       # React Native (Expo)
      contexts/   # Auth context, state
      services/   # API client (axios)
  docker-compose.yml
  .github/workflows/   # CI/CD
```

---

## Required API Keys & Secrets

### Backend Environment Variables

| Variable                   | Required   | Description                                                        | Example                                                        |
| -------------------------- | ---------- | ------------------------------------------------------------------ |----------------------------------------------------------------|
| `SECRET_KEY`               | Yes        | JWT signing key. Minimum 32 characters.                            | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DATABASE_URL`             | Local only | Full PostgreSQL connection string.                                 | `postgresql://postgres:pass@db:5432/gotta_minute_fitness`      |
| `INSTANCE_CONNECTION_NAME` | Cloud Run  | Cloud SQL instance path. Takes priority over DATABASE_URL.         | `Cloudsqlinstance`                                             |
| `DB_USER`                  | Cloud Run  | Cloud SQL username.                                                | `DBUser`                                                       |
| `DB_PASS`                  | Cloud Run  | Cloud SQL password.                                                | Password                                                       |
| `DB_NAME`                  | Cloud Run  | Cloud SQL database name.                                           | `DB Name`                                                      |
| `GEMINI_API_KEY`           | No*        | Google Gemini API key for AI workout generation and scan insights. | `API`                                                          |
| `GEMINI_MODEL`             | No         | Gemini model to use.                                               | `gemini-2.5-flash-lite` (default)                              |
| `ADMIN_API_TOKEN`          | No*        | Token for admin endpoints (exercise sync). Pick any strong string. | `ADMINKEY`                                                     |
| `ALLOWED_ORIGINS`          | No         | Comma-separated CORS origins.                                      | `https://your-app.com`                                         |
| `PORT`                     | No         | Server port.                                                       | `8080` (default)                                               |

*Not required to start the API, but needed for full functionality.

### Where to get each key

**SECRET_KEY** -- Generate locally:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**GEMINI_API_KEY** -- Google AI Studio:
1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Select your Google Cloud project
4. Copy the key

**ADMIN_API_TOKEN** -- Self-assigned. Pick any strong password-like string. You'll pass this as a header when calling admin endpoints.

### Mobile Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API URL | `https://minute-fit-347642225327.us-central1.run.app` |

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 22+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)

### 1. Clone and configure

```bash
git clone https://github.com/rkcrayton/minute-fit.git
cd minute-fit
```

Create `.env` in the project root:
```env
SECRET_KEY=your-secret-key-at-least-32-characters-long
DATABASE_URL=postgresql://postgres:your_secure_password_123@db:5432/gotta_minute_fitness
POSTGRES_USER=DB USER
POSTGRES_PASSWORD=your_secure_password_123
POSTGRES_DB=DB NAME
POSTGRES_PORT=5432
API_PORT=8080
ADMIN_API_TOKEN=local-dev-sync-token
GEMINI_API_KEY=your-gemini-key
ALLOWED_ORIGINS=*
```

### 2. Start the backend (Docker Compose)

```bash
docker compose up -d --build
```

This starts:
- **PostgreSQL 16** on port 5432 (with health checks)
- **FastAPI** on port 8080 (with live reload)

On first start, the API automatically:
- Creates all database tables
- Seeds 8 starter exercises

Verify it's running:
```bash
curl http://localhost:8080/health
# {"status": "healthy"}

curl http://localhost:8080/exercises/
# Returns 8 seeded exercises
```

### 3. Start the mobile app

```bash
cd apps/mobile
```

Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

Then:
```bash
npm install
npx expo start
```

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code for physical device (use your machine's local IP instead of localhost)

### 4. Run backend without Docker

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set env vars
export SECRET_KEY="your-secret-key-at-least-32-characters-long"
export DATABASE_URL="postgresql://postgres:pass@localhost:5432/gotta_minute_fitness"

# Start server
cd app
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

---

## Cloud Run Deployment

### Prerequisites

- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- Cloud SQL instance (PostgreSQL) created
- Artifact Registry or Container Registry enabled

### 1. Build and push the Docker image
1. **Connect github repo**
	1. Point cloud run to the Dockerfile within the project located: ```apps/api/Dockerfile```
	2. Name the service name : ```gottaminutefit```
	3. Region: ```us-central(Iowa)```
	4. Authentication: `Aloww public access`
	5. Billing : `Request based`
	6. Service scaling: `Auto scaling`
		1. Minimum number of instances: `1`
	7. **Containers, Network, and Security**
		1. **Settings**
			1. Container port: `8080`
			2. Resources:
				1. memory: `2GIB`
				2. CPU: `1`
		2. **Variables and Secrets**
			FILL IN ALL BELOW WITH VALUES:
			1. INSTANCE_CONNECTION_NAME
			2. DB_USER
			3. DB_NAME
			4. ALLOWED_ORIGINS
			5. ACCESS_TOKEN_EXPIRE_MINUTES
			6. GEMINI_MODEL
			7. GEMINI_API_KEY
			8. ADMIN_API_TOKEN
			Reference a secret you will connect your secret store:
			9. SECRET_KEY
			10. DB_PASS
		3. **Security**
			No security for now but will need some later.
	8. **Cloud Sql connections**
		1. If you have a cloud sql already running use the dropdown and select it. If you do not have a cloud sql running create one and connect it.

### 2. Create the Cloud SQL instance (if not exists)
1. Navigate to the Cloud SQL section in the Google cloud
2. Create a instance within the cloudsql project(Postgres preferably)
3. inside of the instance navigate to the database tab and create your gotta_minute_fitness database
4. You will need to take note of the db instance name if you created a new one. This will be used by the cloud run container.
### 3. Deploy to Cloud Run
Once you have connected the cloud sql instance you are ready to deploy the cloud run container.

### 4. Verify deployment
You can verify deployment by visting the url that is given on the main page of the cloud run instance.

### 5. Update an existing deployment
You can edit the deployment by clicking on the edit & deploy revisions near the top of the page.
You can also edit the repo it is using to build in the edit repo settings near the top of the page beside edit and deploy.

---

## Database Setup

### Connection Priority

The API resolves the database URL in this order:

1. **`INSTANCE_CONNECTION_NAME`** -- Cloud SQL Unix socket (production)
   ```
   postgresql+pg8000://{DB_USER}:{DB_PASS}@/{DB_NAME}?unix_sock=/cloudsql/{instance}/.s.PGSQL.5432
   ```

2. **`DATABASE_URL`** -- Explicit connection string (Docker Compose / local)
   ```
   postgresql://postgres:password@db:5432/DB NAME
   ```

3. **Fallback** -- Localhost with DB_USER/DB_PASS/DB_NAME

### Auto-migrations

The API handles schema changes automatically on startup (no manual migration needed):

- `Base.metadata.create_all()` -- creates missing tables
- Column guards add missing columns to existing tables (e.g., `ai_insights`, `equipment`, `profile_picture`)
- Exercise seeding is idempotent

### Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, username, hashed password, profile) |
| `exercises` | Exercise catalog (seeded + Wger synced) |
| `user_exercises` | Logged workout history per user |
| `user_workout_plans` | One plan per user (AI-generated or manual) |
| `scan_results` | Body scan results and AI insights |
| `water_logs` | Daily water intake tracking |

---

## Authentication Flow

### Overview

The API uses **JWT (JSON Web Tokens)** with HS256 signing.

```
Mobile App                          API
    |                                |
    |-- POST /users/register ------->|  Create account
    |<---- 200 UserResponse ---------|
    |                                |
    |-- POST /users/token ---------->|  Login (form-urlencoded)
    |<---- {access_token,            |
    |       refresh_token} ----------|
    |                                |
    |-- GET /users/me -------------->|  Auth'd request
    |   (Authorization: Bearer xxx)  |  (Bearer token in header)
    |<---- UserResponse -------------|
    |                                |
    |  ... 30 min later, 401 ...     |
    |                                |
    |-- POST /users/token/refresh -->|  Auto-refresh
    |   {refresh_token: xxx}         |
    |<---- {new access_token,        |
    |       new refresh_token} ------|
```

### Token Details

| Token | Lifetime | Payload |
|-------|----------|---------|
| Access Token | 30 minutes | `{sub: username, exp, type: "access"}` |
| Refresh Token | 7 days | `{sub: username, exp, type: "refresh", jti: uuid}` |

### Mobile App Token Management

The mobile app (`contexts/auth.tsx`) handles tokens automatically:

1. **Storage**: Tokens stored in `expo-secure-store` (encrypted on-device)
2. **Auto-refresh**: Axios interceptor catches 401 responses, refreshes the token, and retries the original request
3. **Session restore**: On app launch, checks SecureStore for saved tokens and validates via `/users/me`
4. **Logout**: Deletes tokens from SecureStore

### Password Hashing

Passwords are hashed with **Argon2** (via passlib) -- the current industry standard.

---

## Seeding the Exercise Library

### Automatic Seed (8 exercises)

On every startup, the API seeds 8 bodyweight exercises if the `exercises` table is empty. This happens automatically.

### Full Catalog Sync (800+ exercises from Wger)

To import the complete exercise library from the [Wger API](https://wger.de/api/v2/):

```bash
curl -X POST https://YOUR_CLOUD_RUN_URL/admin/sync-exercises \
  -H "X-Admin-Token: YOUR_ADMIN_API_TOKEN"
```

**Important**: This can take 5+ minutes because it fetches images for each exercise. Increase the Cloud Run request timeout first:

Then run the sync. The response will be:
```json
{"inserted": 800, "updated": 8, "skipped": 12, "errors": 0, "pages": 9}
```

The sync is idempotent -- running it again updates existing exercises.

---

## Mobile App Configuration

### API URL Setup

Create `apps/mobile/.env`:

```env
# Production (Cloud Run)
EXPO_PUBLIC_API_BASE_URL=https://minute-fit-347642225327.us-central1.run.app

# Local development
# EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

The mobile app falls back automatically:
- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://localhost:8000`

### Building for Production

```bash
cd apps/mobile

# Build for iOS
npx expo build:ios
# or with EAS
npx eas build --platform ios

# Build for Android
npx expo build:android
# or with EAS
npx eas build --platform android
```

---

## CI/CD Pipeline

### GitHub Actions

Two workflows run on PRs and pushes to `main`:

**Backend** (`.github/workflows/backend.yml`):
- Triggers on changes to `apps/api/**`
- Runs on Ubuntu with Python 3.11
- Installs dependencies, runs `pytest`
- Requires 85% code coverage to pass

**Frontend** (`.github/workflows/frontend.yml`):
- Triggers on changes to `apps/mobile/**`
- Runs on Ubuntu with Node.js 22
- Runs `npm ci` then `npm test` (Jest)

---

## Useful Commands

### Backend

```bash
# Run tests
cd apps/api && make test

# Run tests verbose
make test-v

# Unit tests only
make test-unit

# Integration tests only
make test-integration

# Coverage report (HTML)
make coverage

# Start dev server (no Docker)
make dev

# Sync full exercise library
curl -X POST http://localhost:8080/admin/sync-exercises \
  -H "X-Admin-Token: YOUR_TOKEN"
```

### Docker

```bash
# Start everything
docker compose up -d --build

# View logs
docker compose logs -f api

# Stop
docker compose down

# Reset database
docker compose down -v  # removes volume
docker compose up -d --build
```

### Cloud Run

```bash
# View service info
gcloud run services describe minute-fit --region us-central1

# View logs
gcloud run services logs read minute-fit --region us-central1 --limit 50

# Stream logs
gcloud run services logs tail minute-fit --region us-central1

# Update env vars
gcloud run services update minute-fit \
  --region us-central1 \
  --set-env-vars KEY=VALUE

# Update timeout
gcloud run services update minute-fit \
  --region us-central1 \
  --timeout 900
```

---

## Troubleshooting

### API won't start: "SECRET_KEY must be at least 32 characters"

The API validates `SECRET_KEY` on startup. Generate one:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Cloud Run: "upstream request timeout" on exercise sync

The Wger sync takes several minutes. Increase the timeout:
```bash
gcloud run services update minute-fit --region us-central1 --timeout 900
```

### Cloud Run: exercises endpoint returns empty list

The 8-exercise seed runs on startup. If it returns `[]`, the database connection may have failed during startup. Check logs:
```bash
gcloud run services logs read minute-fit --region us-central1 --limit 50
```

Look for `Exercise seed complete` or `Exercise seeding FAILED`.

### Mobile app can't connect to local API

- **iOS Simulator**: Use `http://localhost:8080`
- **Android Emulator**: Use `http://10.0.2.2:8080` (special alias for host machine)
- **Physical Device**: Use your machine's local IP (e.g., `http://192.168.1.x:8080`)

### 401 errors on every request

- Check that `SECRET_KEY` is the same value that was used to sign the tokens
- If you changed `SECRET_KEY`, all existing tokens are invalidated -- users must log in again

### Gemini endpoints return 503

`GEMINI_API_KEY` is not set. The API degrades gracefully -- workout generation and scan insights won't work, but everything else does.