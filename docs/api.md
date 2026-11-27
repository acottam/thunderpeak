# Thunderpeak API Reference

Live: https://thunderpeak-api.onrender.com (Render free plan, the first request after a pause takes about a minute).
Local: http://localhost:3000. The phone cannot reach `localhost`, so use the live URL or your computer's network address.

This is the contract the mobile app and the API build against. Each endpoint is marked:

| Mark | Meaning |
|---|---|
| **Live** | Merged and working. The examples below are real responses. |
| **Proposed** | Not built. The shape is the agreed contract to build against. Raise changes in Teams or in the pull request before building. |

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

### Catalogue fields on every park (Live)

These come from Arlin's `ALTER TABLE parks` change, and Godwin's import fills them. They are included in the same objects.

| Field | Type | Meaning |
|---|---|---|
| `park_code` | string | NPS park code, for example `yell` |
| `designation` | string | `National Park` or `National Monument` |
| `latitude`, `longitude` | number | Coordinates |
| `image_url` | string or null | Photo from NPS |
| `point_value` | integer | Points for an eligible check-in (see `docs/park-monument-point-values.md`) |


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

A token holds only the user id (`sub`) and an expiry (`exp`). The phone keeps it with `expo-secure-store` and sends it on every signed-in request. A 401 on a signed-in request means the token is expired or invalid, so send the person to the login screen.

### Limits (Live)

Sign-in allows 10 failed attempts per IP per 15 minutes (a correct password never counts). Sign-up allows 10 attempts per IP per hour. This is off on Render until `TRUST_PROXY` is set, so the live API may not return 429 yet.

## Visits (Live, owner: Godwin)

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

The database migration adds two views: `scored_visits` calculates an award for each check-in, and `user_scores` totals all park awards and counts all check-ins, including repeats. All recorded check-ins count for now; there is no verification status yet. Sprint 2's score counts park check-ins only. Sprint 3 adds hikes, activities and wildlife (see the next section).

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

## Hikes, Activities and Wildlife (Proposed, Sprint 3)

Agreed Nov 27. Owners: Arlin (migration 002 and scoring views), Godwin (hike and activity endpoints), Adam (animal and sighting endpoints) and Aruzhan (screens).

A check-in comes first. Hikes, activities and wildlife sightings are then logged against that visit, and the score adds them up.

### Scoring rules

| Item | Points | Limit | Source |
|---|---|---|---|
| Hike | The difficulty's `base_points`: Easy 5, Moderate 10, Hard 20 | One hike per difficulty per visit | `hike_difficulties`, unique on `visit_hikes (visit_id, hike_difficulty_id)` |
| Activity, including camping | The activity's `base_points`, for example Camping 8, Photography 3 | One of each activity per visit | `activities`, new unique on `visit_activities (visit_id, activity_id)` |
| Wildlife sighting | `ROUND(base_points × rarity_multiplier)`, for example Grizzly Bear 10 × 3.5 = 35, Bald Eagle 8 × 2.5 = 20 | One award per user, park and species in a rolling 12 months | `animals`, unique on `visit_animal_sightings (visit_id, animal_id)` |

Details:

- **Camping** is the regular `Camping` activity. Nights are not recorded, so camping scores 8 points per visit however long the stay.
- **Same-day repeats.** A person can check in at the same park more than once on the same date. Hikes and activities score once per user, park and visit date, so logging a Hard hike on two check-ins that day earns 20 points once. The first by visit ID earns the points, and the rest are saved with 0.
- **Wildlife** follows the park check-in rule. The first sighting of a species at a park earns points, and the next award for that species at that park must be at least 12 months later. Sightings are ordered by their visit's `visited_date`, then by sighting ID. A sighting uses its visit's date, so there is no separate sighting date. The same species at a different park scores separately.
- **Park points don't matter.** Hikes, activities and sightings can earn points on a check-in that scored 0 park points (a repeat visit within 12 months).
- **Any activity at any park.** `parks_activities` is empty, so Sprint 3 does not check whether a park offers an activity. Add that check once the table is filled.
- **Calculated, not stored.** Like `scored_visits`, awards come from database views, so a backdated visit or a corrected point value can change earlier awards. The `points_awarded` returned by a `POST` is the value at that moment.

### Database changes (migration 002, owner: Arlin)

No new tables or columns are needed.

1. Add `UNIQUE (visit_id, activity_id)` to `visit_activities`. Remove duplicate rows first, if there are any.
2. Add views `scored_hikes`, `scored_activities` and `scored_sightings`, each with one row per logged item and a `points_awarded` column, following the rules above.
3. Extend `user_scores` with `park_points`, `hike_points`, `activity_points` and `wildlife_points`, and make `total_points` their sum. Total each category in its own subquery before joining to `users`, so joins don't multiply points.
4. Database tests for: a duplicate hike difficulty and duplicate activity on one visit, the same-day repeat rule, wildlife at the 12-month boundary, the same species at two parks, a backdated sighting, and rounding.

### `GET /hike-difficulties`, `GET /activities`, `GET /animals`

Public lists for the Log Activity and Wildlife screens, sorted by `base_points` then name (animals by `point_value` descending, then name).

```json
[{ "id": 3, "name": "Hard", "base_points": 20, "description": "Challenging trail, significant elevation and/or distance" }]
```

```json
[{ "id": 2, "name": "Camping", "base_points": 8, "description": "Overnight camping adventure" }]
```

```json
[{ "id": 2, "name": "Grizzly Bear", "base_points": 10, "rarity_multiplier": 3.5, "point_value": 35, "description": "Endangered apex predator, thrilling sighting" }]
```

`rarity_multiplier` is a JSON number. `point_value` is the rounded award for a first sighting.

### Logging against a visit

All of these need a token. The visit must belong to the signed-in user. Someone else's visit returns 404, the same as a visit that doesn't exist.

| Endpoint | Body | Owner |
|---|---|---|
| `POST /visits/:id/hikes` | `{ "hike_difficulty_id": 3 }` | Godwin |
| `POST /visits/:id/activities` | `{ "activity_id": 2 }` | Godwin |
| `POST /visits/:id/sightings` | `{ "animal_id": 2 }` | Adam |

Success is 201 with the saved item and its award. The sighting also returns `next_eligible_date`, the first date this species can earn points again at this park.

```json
{ "id": 31, "visit_id": 12, "hike_difficulty_id": 3, "name": "Hard", "points_awarded": 20 }
```

```json
{ "id": 9, "visit_id": 12, "activity_id": 2, "name": "Camping", "points_awarded": 8 }
```

```json
{ "id": 44, "visit_id": 12, "animal_id": 2, "name": "Grizzly Bear", "points_awarded": 35, "next_eligible_date": "2027-11-21" }
```

| Status | Message |
|---|---|
| 400 | `Visit id must be a positive integer`, or `hike_difficulty_id must be a positive integer` (likewise `activity_id`, `animal_id`) |
| 401 | `Sign in required` |
| 404 | `Visit not found`, or `Hike difficulty not found` (likewise `Activity not found`, `Animal not found`) |
| 409 | `That hike difficulty is already logged for this visit` (likewise `That activity is already logged for this visit`, `That animal is already logged for this visit`) |

Removing a logged item is not in Sprint 3.

### `GET /visits/:id`

Needs a token. Returns one of the signed-in user's visits with everything logged against it, for the visit screen. 404 `Visit not found` for another user's visit.

```json
{
  "id": 12,
  "park_id": 1,
  "park_name": "Yellowstone National Park",
  "visited_date": "2026-11-21",
  "points_awarded": 50,
  "hikes": [{ "id": 31, "hike_difficulty_id": 3, "name": "Hard", "points_awarded": 20 }],
  "activities": [{ "id": 9, "activity_id": 2, "name": "Camping", "points_awarded": 8 }],
  "sightings": [{ "id": 44, "animal_id": 2, "name": "Grizzly Bear", "points_awarded": 35 }],
  "total_points": 113
}
```

`points_awarded` at the top is the park check-in award. `total_points` adds the park award and every item on the visit.

### `GET /me/score` (Sprint 3 change)

Adds a breakdown. The existing fields keep their names, so the current app keeps working.

```json
{
  "total_points": 113,
  "visit_count": 1,
  "breakdown": { "parks": 50, "hikes": 20, "activities": 8, "wildlife": 35 }
}
```

The leaderboard query on `user_scores` stays the same and ranks on the new `total_points`.

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
