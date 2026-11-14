frankfurt-postgres.render.com@5432
# thunderpeak
Thunderpeak — a gamified National Park adventure app

## Favorite Quotes

> "Work Hard... Be Nice." — Adam Cottam

> "The more you sweat in training, the less you bleed in combat." - Godwin Bassey

> "Without hard work, nothing grows but weeds" -Arlin Jones

> "The mountains are calling, and I must go." — Aruzhan Abilmazhin

## Project Structure

| Folder | What it is |
|---|---|
| `mobile/` | React Native app (Expo, TypeScript) |
| `api/` | Node.js and Express REST API |
| `docker-compose.yml` | Local PostgreSQL for development |

## Getting Started

### Prerequisites

| Tool | Needed for | Install |
|---|---|---|
| Node.js 22.13 or newer (24 recommended) | Everyone | https://nodejs.org (or `nvm use`, this repo has an `.nvmrc`) |
| git | Everyone | https://git-scm.com/downloads |
| Expo Go app (iOS or Android) | Running the mobile app on a phone | Search "Expo Go" in the App Store or Google Play |
| A PostgreSQL database | Anyone working on the API or database | Option A: Docker Desktop, or Option B: PostgreSQL (see step 2) |

Check your versions:

```bash
node -v    # should print v22.13.0 or higher
git --version
```

You do not need Xcode or Android Studio. If you only work on mobile screens with sample data, you do not need a database or Docker at all.

### 1. Clone and install

```bash
git clone https://github.com/acottam/thunderpeak.git
cd thunderpeak
cd api && npm install && cd ..
cd mobile && npm install && cd ..
```

### 2. Start a local database

Pick one option.

**Option A: Docker (easiest)**

Install Docker Desktop from https://www.docker.com/products/docker-desktop, open it, wait until it says it is running, then:

```bash
docker compose up -d
```

On Windows, Docker Desktop needs WSL 2 and virtualization enabled in BIOS.

**Option B: Install PostgreSQL directly (no Docker)**

Install PostgreSQL 17 from https://www.postgresql.org/download, then create the user and database the API expects:

```bash
psql -U postgres
```

```sql
CREATE USER thunderpeak WITH PASSWORD 'thunderpeak';
CREATE DATABASE thunderpeak OWNER thunderpeak;
```

If your database uses different credentials, change `DATABASE_URL` in `api/.env` to match.

### 3. Configure and run the API

```bash
cd api
cp .env.example .env     # never commit .env
npm run dev
```

Check it works: open http://localhost:3000/health (API) and http://localhost:3000/health/db (database).

To populate the park catalogue, set `NPS_API_KEY` in `api/.env`, then run:

```bash
cd api
npm run import:parks
```

This imports National Parks and National Monuments from NPS into the existing `parks` table. The script maps NPS `fullName`, `description`, and `states` to the table's `name`, `description`, and `location` fields.


### 4. Run the mobile app

```bash
cd mobile
npm start
```

Scan the QR code with the Expo Go app on your phone, or press `w` to open it in a web browser.
iOS Simulator needs Xcode and Android Emulator needs Android Studio, but neither is required.
On a physical phone, the app reaches the API using your computer's local network address, not `localhost`.

## Team Workflow

- Work on a branch named `yourname/short-description`, not directly on `main`.
- Open a pull request and have a teammate review it before merging.
- Write meaningful commit messages.
- Never commit `.env` files or API keys.

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `npm install` fails or prints an engine or version error | Node is too old. Run `node -v`, then install Node 22.13 or newer (`nvm install` and `nvm use` read the `.nvmrc`). |
| `/health/db` returns 503 | The database is not running or `DATABASE_URL` in `api/.env` is wrong. Start Docker or PostgreSQL and check the URL. `/health` can still return 200. |
| `Cannot connect to the Docker daemon` | Docker Desktop is installed but not open. Start it and wait until it is running. |
| `port 5432 is already allocated` | Another PostgreSQL is already running. Stop it, or use it (Option B) and skip Docker. |
| Phone cannot reach the API | Use your computer's local network address instead of `localhost`, and keep both on the same Wi-Fi. |
| `.env` is missing | Run `cp .env.example .env` inside `api/`. Never commit `.env`. |
