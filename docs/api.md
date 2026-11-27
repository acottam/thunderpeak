# Thunderpeak API Reference

Live: https://thunderpeak-api.onrender.com (Render free plan, the first request after a pause takes about a minute).
Local: http://localhost:3000. The phone cannot reach `localhost`, so use the live URL or your computer's network address.

This is the contract the mobile app and the API build against. Each endpoint is marked:

| Mark | Meaning |
|---|---|
| **Live** | Merged and working. The examples below are real responses. |
| **Proposed** | Not built. The shape is a proposal for Godwin (owner) and Aruzhan to confirm before building. |

## Conventions

- Requests and responses are JSON. Send `Content-Type: application/json` on requests with a body.
- Field names in rows returned from the database are `snake_case` (`created_at`, `park_id`). New fields follow the same rule, so the app has one style to read.
- Errors always look like `{ "status": "error", "message": "..." }` with one of the status codes below.
- Signed-in requests send `Authorization: Bearer <token>`. Tokens come from `/auth/register` or `/auth/login` and last 7 days.
- Dates are `YYYY-MM-DD`. Timestamps are ISO 8601 in UTC, for example `2026-11-21T03:38:17.482Z`.

| Status | Meaning |
|---|---|
| 200, 201 | Success (201 when something was created) |
| 400 | The request is invalid (bad id, missing or invalid field) |
| 401 | Not signed in, bad or expired token, or wrong username or password |
| 404 | The thing asked for does not exist |
| 409 | Conflict, for example a username that is taken |
| 429 | Too many attempts (sign-in and sign-up limits, only when rate limiting is on) |
| 503 | The database or login is unavailable or not configured |

## Health

| Endpoint | Auth | Result |
|---|---|---|
| `GET /health` | none | 200 `{ "status": "ok", "service": "thunderpeak-api" }` |
| `GET /health/db` | none | 200 `{ "status": "ok", "time": "..." }`, or 503 `{ "status": "error", "message": "database unavailable" }` |

## Parks (Live)

### `GET /parks`

Returns every park and monument, sorted by name. Public. An empty list `[]` means no parks have been loaded.

```json
[
  {
    "id": 2,
    "name": "Arches National Park",
    "description": "Over 2,000 natural stone arches.",
    "location": "UT",
    "created_at": "2026-11-21T03:38:17.482Z",
    "updated_at": "2026-11-21T03:38:17.482Z"
  }
]
```

`location` is the NPS `states` value, a comma separated list such as `ID,MT,WY`.

### `GET /parks/:id`

Returns one park, using the same fields. Errors:

| Status | Message |
|---|---|
| 400 | `Park id must be a positive integer` |
| 404 | `Park not found` |
| 503 | `Park catalogue unavailable` |

### Planned fields on every park (Proposed)

These come from Arlin's `ALTER TABLE parks` change, then Godwin's import fills them. They are added to the same objects, and nothing above is removed.

| Field | Type | Meaning |
|---|---|---|
| `park_code` | string | NPS park code, for example `yell` |
| `designation` | string | `National Park` or `National Monument` |
| `latitude`, `longitude` | number | Coordinates |
| `image_url` | string or null | Photo from NPS |
| `point_value` | integer | Points for an eligible check-in (see `docs/park-monument-point-values.md`) |

Until these exist, the app must treat them as optional and keep working without them.

## Accounts (Live)

Design and reasons are in `docs/login-approach.md`.

### `POST /auth/register`

Body: `{ "username": "ada", "password": "password123" }`

- Username: 3 to 30 characters, letters, digits and underscore. It is stored in lowercase, so `Ada` and `ada` are the same account.
- Password: 8 to 128 characters.

Success, 201:

```json
{ "user": { "id": 1, "username": "ada" }, "token": "<token>" }
```

| Status | Message |
|---|---|
| 400 | `Username must be 3 to 30 characters: letters, digits and underscore` |
| 400 | `Password must be 8 to 128 characters` |
| 409 | `That username is taken` |
| 429 | `Too many sign-up attempts. Try again later.` |
| 503 | `Sign up unavailable`, or `Login is not configured` when the server has no `JWT_SECRET` |

### `POST /auth/login`

Body: the same two fields. Success, 200: `{ "user": { "id": 1, "username": "ada" }, "token": "<token>" }`.

| Status | Message |
|---|---|
| 400 | `Username and password are required` |
| 401 | `Wrong username or password` (the same message for a wrong password and an unknown user) |
| 429 | `Too many sign-in attempts. Try again later.` |
| 503 | `Sign in unavailable`, or `Login is not configured` |

### `GET /me`

Needs a token. Returns the signed-in user: `{ "id": 1, "username": "ada" }`.

| Status | Message |
|---|---|
| 401 | `Sign in required` (no header, wrong scheme, bad, expired or tampered token, or the account no longer exists) |
| 503 | `Login is not configured` or `Account unavailable` |

### Tokens

A token holds only the user id (`sub`) and an expiry (`exp`). The phone keeps it with `expo-secure-store`, the web version keeps it in the browser's `localStorage`, and both send it on every signed-in request. A 401 on a signed-in request means the token is expired or invalid, so send the person to the login screen.

### Limits (Live)

Sign-in allows 10 failed attempts per IP per 15 minutes (a correct password never counts). Sign-up allows 10 attempts per IP per hour. This is off on Render until `TRUST_PROXY` is set, so the live API may not return 429 yet.

## Visits (Proposed, owner: Godwin)

Updated Nov 21 at Aruzhan's request for the park screen: `park_name` and `next_eligible_date` on `POST /visits`, the `park_id` filter on `GET /me/visits`, and `GET /me/parks/:park_id`.

All visit endpoints need a token. The user id always comes from the token, never from the request body.

### `POST /visits`

Records a check-in at a park for the signed-in user.

Body: `{ "park_id": 1, "visited_date": "2026-11-21" }`. `visited_date` is optional and defaults to today. It must not be in the future.

Success, 201:

```json
{
  "id": 12,
  "park_id": 1,
  "park_name": "Yellowstone National Park",
  "visited_date": "2026-11-21",
  "points_awarded": 50,
  "next_eligible_date": "2027-11-21"
}
```

`park_name` matches `GET /me/visits`, so the app can show a confirmation without another request. `next_eligible_date` is the first date this user can earn points at this park again (see `GET /me/parks/:park_id`).

`points_awarded` is the current calculated award from the `scored_visits` view. A park with no point value scores `0` until a value is set. Backdated visits or corrected park values can change earlier calculated awards.

| Status | Message |
|---|---|
| 400 | `park_id must be a positive integer`, or `visited_date must be a date in the form YYYY-MM-DD and not in the future` |
| 401 | `Sign in required` |
| 404 | `Park not found` |

Repeat check-ins are allowed. For each user and park, the first check-in earns the park's points; the next eligible check-in must be at least 12 months after the last point-earning check-in. Additional check-ins are recorded but score zero. Check-ins are evaluated in visit-date order, then by ID for visits on the same date. A check-in on the 12-month anniversary is eligible; for February 29, PostgreSQL uses February 28 in a non-leap year.

### `GET /me/visits`

Returns the signed-in user's visits, newest first. Add `?park_id=1` to return only the visits to one park (400 `park_id must be a positive integer` for a bad value, and `[]` if there are none).

```json
[
  {
    "id": 12,
    "park_id": 1,
    "park_name": "Yellowstone National Park",
    "visited_date": "2026-11-21",
    "points_awarded": 50
  }
]
```

An empty list `[]` means no visits yet.

### `GET /me/parks/:park_id`

The signed-in user's status at one park, for the park screen: have they checked in, and when can they earn points again. The server works this out from the `scored_visits` view, so the app never repeats the 12-month rule.

```json
{
  "park_id": 1,
  "visit_count": 2,
  "last_visited_date": "2026-11-21",
  "last_awarded_date": "2026-03-02",
  "next_eligible_date": "2027-03-02",
  "can_earn_points_now": false
}
```

| Field | Meaning |
|---|---|
| `visit_count` | All check-ins at this park, including ones that scored zero |
| `last_visited_date` | The most recent check-in, or `null` if none |
| `last_awarded_date` | The most recent check-in that earned points, or `null` if none |
| `next_eligible_date` | `last_awarded_date` plus 12 months, or `null` if the user has never checked in here (they can earn points now) |
| `can_earn_points_now` | `true` if a check-in today would earn points |

A park the user has never visited returns 200 with `visit_count: 0`, the three dates `null` and `can_earn_points_now: true`.

One query against the `scored_visits` view gives all of it (check that the park exists first, for the 404):

```sql
SELECT count(*)::int AS visit_count,
       max(visited_date) AS last_visited_date,
       max(visited_date) FILTER (WHERE earns_points) AS last_awarded_date,
       (max(visited_date) FILTER (WHERE earns_points) + INTERVAL '12 months')::date AS next_eligible_date,
       coalesce(current_date >= (max(visited_date) FILTER (WHERE earns_points) + INTERVAL '12 months')::date, true) AS can_earn_points_now
FROM scored_visits
WHERE user_id = $1 AND park_id = $2;
```

| Status | Message |
|---|---|
| 400 | `Park id must be a positive integer` |
| 401 | `Sign in required` |
| 404 | `Park not found` |

### `GET /me/score`

Returns the signed-in user's totals.

```json
{ "total_points": 50, "visit_count": 1 }
```

Both fields are `0` for a new account.

### Scoring queries for the visit API and leaderboard

The database migration adds two views: `scored_visits` calculates an award for each check-in, and `user_scores` totals all park awards and counts all check-ins, including repeats. All recorded check-ins count for now; there is no verification status yet. Hiking, camping, activities and wildlife are not included in this sprint's score.

For one user, use the signed-in user ID as a parameter:

```sql
SELECT total_points, visit_count
FROM user_scores
WHERE user_id = $1;
```

For all users, including users with no visits, the same totals can be ranked:

```sql
SELECT user_id, username, total_points, visit_count,
       RANK() OVER (ORDER BY total_points DESC) AS rank
FROM user_scores
ORDER BY total_points DESC, user_id;
```

PostgreSQL returns these totals and counts as `bigint`; the Node PostgreSQL driver returns them as strings by default. The API should handle conversion safely when forming its JSON response.

The same applies to `latitude` and `longitude` (PostgreSQL `NUMERIC`), which the driver also returns as strings. The API returns all of these as JSON numbers, which is what the mobile app's types expect. Dates are returned as `YYYY-MM-DD` strings.

## Try it

```bash
BASE=https://thunderpeak-api.onrender.com

# Park list
curl $BASE/parks

# Create a test account and keep the token
curl -s -H 'Content-Type: application/json' \
  -d '{"username":"yourname_test","password":"choose-a-password"}' $BASE/auth/register

# Who am I
curl -H "Authorization: Bearer <paste the token>" $BASE/me
```

Please give test accounts a clear name (your name plus `_test`).

## Changing this file

- Change an endpoint and its entry here in the same pull request.
- Mark new endpoints **Proposed** until they are merged, then change them to **Live** and replace the example with a real response.
