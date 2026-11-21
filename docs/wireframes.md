# Thunderpeak Wireframes (Sprint 1)

Author: Aruzhan Abilmazhin

Low-fidelity wireframes for the five core flows. The **Park Catalog** and **Park Detail** screens are built in `mobile/src/app/` with static sample data. The other three are wireframes only and will be built in later sprints.

Point values come from `api/seed.sql` (hikes, activities, animals) and `docs/park-monument-point-values.md` (site visits).

## Flow overview

```
Park Catalog ──tap park──▶ Park Detail ──Check in──▶ Check-in
                               │                        │
                               ├──Log activity──▶ Log Activity ──┐
                               └──Add sighting──▶ Sightings ─────┤
                                                                 ▼
                                                           Visit Score
```

A visit starts with a check-in. Activities, hikes and sightings are attached to that visit, and the score screen totals them.

## 1. Park Catalog (built)

```
┌──────────────────────────────┐
│  Park Catalog                │  green header
├──────────────────────────────┤
│ Pick a park, check in, and   │
│ start earning points.        │
│ ┌──────────────────────────┐ │
│ │ 🔍 Search name or state  │ │
│ └──────────────────────────┘ │
│ (All) (National Parks)       │  filter chips
│ (National Monuments)         │
│ 8 sites · sample data        │
│ ┌──────────────────────────┐ │
│ │ [Y]  Yellowstone N.P.    │›│  thumbnail, name,
│ │      National Park ·     │ │  designation · states,
│ │      ID · MT · WY [50pts]│ │  points per visit
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ [G]  Grand Canyon N.P.   │›│
│ │      ...         [50pts] │ │
│ └──────────────────────────┘ │
│            ...               │
└──────────────────────────────┘
```

- Data: `GET /parks` (`id, name, description, location`). Sprint 1 uses `mobile/src/data/sampleParks.ts`, which has the same shape.
- Search matches the name or a state code. Empty result shows "No parks match …".

## 2. Park Detail (built)

```
┌──────────────────────────────┐
│ ‹  Yellowstone               │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │      park photo (NPS)    │ │  colored placeholder for now
│ └──────────────────────────┘ │
│ Yellowstone National Park    │
│ National Park · ID · MT · WY │
│ [50 pts] Large park · per    │
│          verified visit      │
│ ┌──────────────────────────┐ │
│ │   Check in at this park  │ │  primary action
│ └──────────────────────────┘ │
│ About                        │
│ The first national park ...  │
│ Activities                   │
│ (Photography) (Camping) ...  │
│ Wildlife you might spot      │
│ (Gray Wolf) (Grizzly Bear)   │
│ ┌────────────┐┌────────────┐ │
│ │Log activity││Add sighting│ │  secondary actions
│ └────────────┘└────────────┘ │
└──────────────────────────────┘
```

- Data: `GET /parks/:id`. Activities will come from `parks_activities`; wildlife list is a suggestion only.
- Buttons show "Coming in a later sprint" until those flows exist.
- Unknown id shows a "Park not found" screen.

## 3. Check-in (wireframe)

```
┌──────────────────────────────┐
│ ‹  Check in                  │
├──────────────────────────────┤
│ Yellowstone National Park    │
│                              │
│ ┌──────────────────────────┐ │
│ │      map with pin        │ │  device location vs park
│ │   📍 You are 1.2 km in   │ │
│ └──────────────────────────┘ │
│ Visit date   [ 16 Nov 2026 ] │
│                              │
│ ✓ Location verified          │  or: "You need to be in
│                              │       the park to check in"
│ ┌──────────────────────────┐ │
│ │     Start my visit       │ │  → creates row in `visits`
│ └──────────────────────────┘ │
│ +50 pts when verified        │
└──────────────────────────────┘
```

- Uses `latitude` / `longitude` from NPS (not in the `parks` table yet).
- Open question: do repeat visits earn full points again?

## 4. Log Activity (wireframe)

```
┌──────────────────────────────┐
│ ‹  Log activity              │
├──────────────────────────────┤
│ Hike (one per difficulty)    │
│ ( Easy 5 ) (Moderate 10)     │
│ ( Hard 20 )                  │  already logged = disabled ✓
│                              │
│ Other activities             │
│ ☐ Photography          3 pts │
│ ☐ Camping              8 pts │
│ ☐ Stargazing           5 pts │
│ ☐ Fishing              6 pts │  only activities available
│   ...                        │  at this park
│ ┌──────────────────────────┐ │
│ │        Save (+16)        │ │  live total of selection
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- Writes to `visit_hikes` (unique per difficulty) and `visit_activities`.

## 5. Wildlife Sightings (wireframe)

```
┌──────────────────────────────┐
│ ‹  Add sighting              │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 🔍 Search animals        │ │
│ └──────────────────────────┘ │
│ Rare                         │
│  Gray Wolf     10 × 3.5 = 35 │
│  Grizzly Bear  10 × 3.5 = 35 │
│ Notable                      │
│  Moose          8 × 2.5 = 20 │
│ Common                       │
│  Squirrel       2 × 1.0 =  2 │
│  ✓ Elk (already seen)        │  one per species per visit
│                              │
│ ┌──────────────────────────┐ │
│ │     Add Moose (+20)      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- Points = `base_points × rarity_multiplier` from `animals`. Writes to `visit_animal_sightings`.

## 6. Visit Score (wireframe)

```
┌──────────────────────────────┐
│ ‹  Your visit                │
├──────────────────────────────┤
│   Yellowstone · 16 Nov 2026  │
│                              │
│          ┌───────┐           │
│          │  121  │           │  big total
│          │ points│           │
│          └───────┘           │
│ Site visit (large)       50  │
│ Hike: Hard               20  │
│ Hike: Easy                5  │
│ Photography               3  │
│ Camping                   8  │
│ Gray Wolf (×3.5)         35  │
│ ──────────────────────────── │
│ Total                   121  │
│                              │
│ [ Back to catalog ]          │
└──────────────────────────────┘
```

## Team review

Please leave comments on the PR. Things I would like feedback on:

1. Is the Catalog → Detail → Check-in order right, or should check-in be reachable from the catalog card directly?
2. Should the catalog show points per visit before the size classes are agreed?
3. Colors: forest green `#2F5D3A` + summit gold `#E0A526` for points. OK?
4. Anything missing on the detail screen (hours, fees, directions from NPS)?

| Reviewer | Date | Notes | Status |
|---|---|---|---|
| | | | |
