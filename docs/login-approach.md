# Thunderpeak: Login Approach (Sprint 2 recommendation)

Proposed by Adam Cottam. Status: **draft for team decision**, written Fri Nov 20, 2026.

## Decision needed

Scores, visits and leaderboards belong to a person, so the app needs to know who is signed in. The `users` table already requires a `password_hash`, which assumes passwords. This page recommends how to build login in Sprint 2 and asks the team to approve it.

## Recommendation

Username and password, checked by our own API, which returns a signed token that the phone sends with each request.

| Part | Choice | Why |
|---|---|---|
| Sign-in method | Username and password | Matches the current `users` table. No outside accounts or services to set up. |
| Password storage | Node's built-in `crypto.scrypt` with a random salt per user | Slow by design, and it needs no extra package or native build. Node 24 is on every machine and on Render. |
| Session | Signed token (JWT, HS256) in an `Authorization: Bearer` header | Works for a phone app, unlike cookie sessions, and the API stays stateless on Render's free plan. |
| Token library | `jsonwebtoken` 9.0.3 (alternative: `jose` 6.2.18) | Widely used and simple. Both are fine. |
| Token lifetime | 7 days, no refresh tokens in Sprint 2 | Keeps the work small. Users sign in again after a week. |
| Token storage on the phone | `expo-secure-store` | Documented for Expo SDK 58 and included in Expo Go. Encrypted on the device. |
| Secret | `JWT_SECRET` environment variable, 32 or more random bytes | Set in `api/.env` locally and in the Render dashboard. Never committed. |

## Options considered

| Option | What it is | Effort | Verdict |
|---|---|---|---|
| **A. Username and password with our own API (recommended)** | Described above | About 6 hours total | Fits the schema, no new accounts, easy to test |
| B. Hosted sign-in service (Auth0, Firebase, Supabase and similar) | A third party handles accounts and tokens | More setup, new accounts and keys, free-tier limits | Overkill for this project, and it changes the schema |
| C. No login, the phone sends a user id | Fast to build | About 1 hour | Anyone could post visits as anyone. Fine only as a short-lived test stand-in. |
| D. Cookie sessions, as in a website | Server stores a session id in a cookie | Medium | Awkward in React Native and needs server-side session storage |

## How it would work

### Endpoints

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /auth/register` | `{ username, password }` | 201 `{ user: { id, username }, token }` | 400 invalid input, 409 username taken |
| `POST /auth/login` | `{ username, password }` | 200 `{ user: { id, username }, token }` | 400 missing fields, 401 wrong username or password |
| `GET /me` | none, token required | 200 `{ id, username }` | 401 missing or invalid token |

Errors keep the existing shape: `{ "status": "error", "message": "..." }`.

Protected routes (`POST /visits`, `GET /me/visits`, `GET /me/score`) use an auth middleware that reads the token, checks the signature and expiry, and puts the user id on the request.

### Rules

- Usernames are 3 to 30 characters: letters, digits and underscore. They are stored in lowercase, so `Adam` and `adam` are the same account. The current `UNIQUE (username)` then works without a schema change.
- Passwords are 8 to 128 characters.
- The login error never says which part was wrong.
- The stored hash looks like `scrypt$N$r$p$salt$hash` and fits `password_hash VARCHAR(255)`. Comparison uses `crypto.timingSafeEqual`.
- Tokens carry the user id (`sub`) and an expiry (`exp`). Nothing else.
- Render already serves the API over HTTPS. Keep it that way, because passwords cross the network.

### Schema impact

None needed for Sprint 2. The `users` table already has `id`, `username` and `password_hash`. `fitness_level` is optional and unused for now.

## Work and hours

| Task | Owner | Hrs |
|---|---|---|
| This recommendation, reviewed and approved | Adam | 1 |
| Register and login endpoints, password hashing, token signing | Adam | 4 |
| Auth middleware for protected routes | Adam | 1 |
| Login screen and secure token storage on the phone | Aruzhan | 1 |
| Tests for register, login and a protected route | with Godwin's test tasks | included there |

## Risks and limits

| Risk | Plan |
|---|---|
| No password reset (no email service) | Out of scope. Document it. A forgotten password means a new account for now. |
| Guessing attacks on login | Add `express-rate-limit` (8.7.5) on the auth routes if time allows. |
| A stolen token works until it expires | 7 days is the tradeoff. Shorten it or add refresh tokens later. |
| `JWT_SECRET` is missing in an environment | The API logs a warning at startup, and `/auth` and `/me` answer 503 "Login is not configured". Parks and health keep working, so a deploy before the secret is set cannot take the API down. |
| Render's free service sleeps | The first request after a pause takes about a minute. Show a loading state. |

## Questions for the team

| # | Question | Recommendation |
|---|---|---|
| 1 | Approve username and password with our own API? | Yes |
| 2 | Token lifetime? | 7 days |
| 3 | Is a password-reset flow needed this semester? | No |
| 4 | Should Godwin build `POST /visits` against a test user id until login lands? | Yes, then switch to the middleware |
