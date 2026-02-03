# Minute Fit

This repository contains the full stack for **Gotta Minute Fit Lab**, including:

- **Expo React Native frontend** (mobile app)
- **Backend API** (Dockerized)
- **Database** (Dockerized)
- Supporting documentation and scripts

---

## Prerequisites

Make sure the following are installed on your system:

### Required
- **Node.js** (LTS recommended)
- **npm** or **yarn**
- **Docker Desktop** (with Docker Compose)
- **Git**

### Recommended
- Expo Go app (for physical device testing)
- Android Studio (Android emulator)
- Xcode (iOS simulator, macOS only)

---

## Quick Start (Local Development)

### Start Backend + Database (Docker)

From the **repo root**:
```bash
docker compose up -d --build
```

Verify containers are running:
```bash
docker compose ps
```

To view logs:
```bash
docker compose logs -f
```

To stop services:
```bash
docker compose down
```

To fully reset the database (removes volumes):
```bash
docker compose down -v
```

### Run the Expo Frontend
From the repo root:
```bash
cd apps/mobile
npm install
npx expo start
```

Then:
- Press a → Android emulator
- Press i → iOS simulator (macOS)
- Or scan QR code with Expo Go on your phone


### Environment Variables
You will need to set up an `.env` file to properly connect the Docker services together.  
This file contains configuration values such as database credentials, ports, and secrets required for the backend to communicate with the database.
