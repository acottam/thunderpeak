# Sprint 3 schema check

**Decided Nov 27:** see "Hikes, Activities and Wildlife" in `docs/api.md`. Camping stays a regular activity with no night count. Hikes stay one per difficulty per visit (several hikes per visit can move to Sprint 4). Wildlife scores once per user, park and species in a rolling 12 months, using the visit date. Migration 002 adds one unique constraint and the scoring views, with no new tables or columns.

The original change list follows for reference.

- **Camping:** `visit_activities` can record camping repeatedly but does not store nights. Decide whether to add a camping record with a night count or dates. Multiple nights must earn no more points than one night; confirm whether separate camping entries on one visit also count only once.
- **Hikes:** `visit_hikes` currently has a unique constraint on visit and difficulty, so it cannot record several hikes of the same difficulty in one visit. Remove or replace that constraint when individual hikes can be distinguished. Decide what identifies a hike and how each hike earns points.
- **Wildlife:** `visit_animal_sightings` allows one record per species per visit. The scoring rule is one award per user, park and species in a rolling 12-month period, even across different visits. Decide whether to store individual sighting counts or individual observations; use their dates to calculate eligible awards in order, including backdated records.
- **Scores:** The Sprint 2 `user_scores` view includes park check-ins only. Add camping, hiking and wildlife contributions once their scoring rules and data are agreed. Keep each contribution separate when aggregating so joins do not multiply points.

Plan a migration for existing data and tests for repeat events, rolling-year boundaries and backdated entries before implementing these changes.
