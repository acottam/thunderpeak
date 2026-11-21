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

If port 5432 is already in use on your machine, see Troubleshooting below for how to use a different port.

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

### 3. Configure, load the database and run the API

```bash
cd api
cp .env.example .env     # never commit .env
# Set JWT_SECRET in api/.env before using login (see "Login secret" below)
npm run migrate          # creates the tables and loads the reference data
npm run dev
```

`npm test` runs the API tests (no database needed).

A new database is empty, so `npm run migrate` is required once. It creates 10 tables and seeds hike difficulties, animals and activities.
Running it a second time on the same database fails on the seed step. To start over locally, run `docker compose down -v` and then `docker compose up -d` and `npm run migrate` again.

Check it works: open http://localhost:3000/health (API) and http://localhost:3000/health/db (database).

#### Login secret

Sign-up and sign-in need a secret in `api/.env` to sign login tokens. `.env.example` leaves it empty, so set your own:

1. Generate a value (at least 32 characters):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. Paste it after `JWT_SECRET=` in `api/.env`, with no quotes or spaces.
3. Restart the API.

Each person uses their own secret and never shares or commits it. The live API on Render has a different one, so a token from one environment does not work in the other. Without a secret, `/auth` and `/me` answer 503 and the park routes keep working. If a secret changes, everyone signed in with the old one has to sign in again.

#### NPS API key

Anything that calls the National Park Service API needs a key. Each person registers their own free key at https://www.nps.gov/subjects/developer/get-started.htm and puts it in `api/.env` as `NPS_API_KEY`. Never commit a key, and do not put one in any other file in the repo, because this repository is public. If a key is ever committed, get a new one: deleting the file does not remove it from Git history.

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

## Live API

The API runs on Render at https://thunderpeak-api.onrender.com (check `/health` and `/health/db`).

Endpoint reference with request and response examples: [docs/api.md](docs/api.md).

- It uses Render's free plan and goes to sleep after 15 minutes without traffic. The first request afterward takes about a minute.
- Every merge to `main` deploys automatically.
- The team database is hosted on Render and is not open to outside connections. If you need access, ask Adam in the private Teams channel. Never post a connection string anywhere public.
- Render's free database expires on 2026-12-14.
- Login needs a `JWT_SECRET` environment variable on the Render service. Without it the API still runs, but `/auth` and `/me` answer 503.
- Login rate limiting (10 failed sign-ins per IP per 15 minutes) needs `TRUST_PROXY` on Render, the number of proxies in front of the app. Until it is set, the limiter is off and the API logs a warning. To check a value: set `TRUST_PROXY=1`, send 11 wrong sign-ins from your computer (you should get 429), then try one from a phone on cellular data. If the phone also gets 429, everyone shares one bucket, so try `TRUST_PROXY=2`.

## Team Workflow

1. Start from the latest `main`: `git checkout main`, then `git pull`.
2. Work on a branch named `yourname/short-description`, never directly on `main`.
3. Write meaningful commit messages. Before you open a pull request, run the checks for the part you changed:
   - `api/`: `npm run lint` and `npm test`, then run the API and check `/health/db`
   - `mobile/`: `npm run lint` and `npm run typecheck`
4. Open a pull request with a short description of what changed and how you tested it.
5. A teammate other than the author reviews it. Reviewers check that it runs, that nothing secret is committed and that the change matches the description.
6. Merge with a regular merge commit so each author's commits stay in the history. Delete the branch afterward.

Never commit `.env` files, passwords, connection strings or API keys. If one is committed by accident, tell the team and replace the secret, because it stays in Git history.

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `npm install` fails or prints an engine or version error | Node is too old. Run `node -v`, then install Node 22.13 or newer (`nvm install` and `nvm use` read the `.nvmrc`). |
| `/health/db` returns 503 | The database is not running or `DATABASE_URL` in `api/.env` is wrong. Start Docker or PostgreSQL and check the URL. `/health` can still return 200. |
| `Cannot connect to the Docker daemon` | Docker Desktop is installed but not open. Start it and wait until it is running. |
| `port 5432 is already allocated` or `address already in use` | Another PostgreSQL (or container) already uses port 5432. Either stop it, or run ours on a different port: create a `.env` file in the repo root with `POSTGRES_PORT=5433`, set `DATABASE_URL` in `api/.env` to use `localhost:5433`, then run `docker compose up -d` again. Or skip Docker and use Option B. |
| Phone cannot reach the API | Use your computer's local network address instead of `localhost`, and keep both on the same Wi-Fi. |
| `relation does not exist` or the tables are missing | The database has not been loaded. Run `npm run migrate` inside `api/`. |
| `npm run migrate` fails with `duplicate key value` | The seed already ran on this database. Reset a local database with `docker compose down -v`, then start it again and migrate. |
| `503` with `Login is not configured` from `/auth` or `/me` | `JWT_SECRET` is missing, or shorter than 32 characters, in `api/.env`. Add it (see Login secret) and restart the API. |
| `401 Sign in required` right after signing in | The token was made with a different `JWT_SECRET`, for example a local token sent to the live API, or a secret that changed. Sign in again against the same server. |
| `.env` is missing | Run `cp .env.example .env` inside `api/`. Never commit `.env`. |
