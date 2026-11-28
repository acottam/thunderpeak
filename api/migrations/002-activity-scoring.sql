-- Refuse duplicate activity rows rather than deleting existing user data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'visit_activities'::regclass
      AND conname = 'visit_activities_visit_activity_key'
  ) THEN
    ALTER TABLE visit_activities
      ADD CONSTRAINT visit_activities_visit_activity_key UNIQUE (visit_id, activity_id);
  END IF;
END $$;

CREATE OR REPLACE VIEW scored_hikes AS
SELECT h.id, h.visit_id, v.user_id, v.park_id, v.visited_date, h.hike_difficulty_id,
  CASE WHEN ROW_NUMBER() OVER (
    PARTITION BY v.user_id, v.park_id, v.visited_date, h.hike_difficulty_id
    ORDER BY v.id, h.id
  ) = 1 THEN d.base_points ELSE 0 END AS points_awarded
FROM visit_hikes h
JOIN visits v ON v.id = h.visit_id
JOIN hike_difficulties d ON d.id = h.hike_difficulty_id;

CREATE OR REPLACE VIEW scored_activities AS
SELECT a.id, a.visit_id, v.user_id, v.park_id, v.visited_date, a.activity_id,
  CASE WHEN ROW_NUMBER() OVER (
    PARTITION BY v.user_id, v.park_id, v.visited_date, a.activity_id
    ORDER BY v.id, a.id
  ) = 1 THEN activity.base_points ELSE 0 END AS points_awarded
FROM visit_activities a
JOIN visits v ON v.id = a.visit_id
JOIN activities activity ON activity.id = a.activity_id;

CREATE OR REPLACE VIEW scored_sightings AS
WITH RECURSIVE ordered_sightings AS (
  SELECT s.id, s.visit_id, v.user_id, v.park_id, v.visited_date, s.animal_id,
    ROW_NUMBER() OVER (
      PARTITION BY v.user_id, v.park_id, s.animal_id ORDER BY v.visited_date, s.id
    ) AS sighting_number
  FROM visit_animal_sightings s
  JOIN visits v ON v.id = s.visit_id
),
awards AS (
  SELECT s.*, s.visited_date AS last_awarded_date, TRUE AS earns_points
  FROM ordered_sightings s
  WHERE s.sighting_number = 1
  UNION ALL
  SELECT s.*,
    CASE WHEN s.visited_date >= (a.last_awarded_date + INTERVAL '12 months')::date
      THEN s.visited_date ELSE a.last_awarded_date END,
    s.visited_date >= (a.last_awarded_date + INTERVAL '12 months')::date
  FROM awards a
  JOIN ordered_sightings s ON s.user_id = a.user_id AND s.park_id = a.park_id
    AND s.animal_id = a.animal_id AND s.sighting_number = a.sighting_number + 1
)
SELECT a.id, a.visit_id, a.user_id, a.park_id, a.visited_date, a.animal_id, a.earns_points,
  CASE WHEN a.earns_points THEN ROUND(animal.base_points * animal.rarity_multiplier)::integer
    ELSE 0 END AS points_awarded
FROM awards a
JOIN animals animal ON animal.id = a.animal_id;

-- Aggregate each category separately to avoid multiplying awards in joins.
CREATE OR REPLACE VIEW user_scores AS
SELECT u.id AS user_id, u.username,
  COALESCE(parks.visit_count, 0) AS visit_count,
  COALESCE(parks.points, 0) + COALESCE(hikes.points, 0)
    + COALESCE(activities.points, 0) + COALESCE(sightings.points, 0) AS total_points,
  COALESCE(parks.points, 0) AS park_points,
  COALESCE(hikes.points, 0) AS hike_points,
  COALESCE(activities.points, 0) AS activity_points,
  COALESCE(sightings.points, 0) AS wildlife_points
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS visit_count, SUM(points_awarded) AS points
  FROM scored_visits GROUP BY user_id
) parks ON parks.user_id = u.id
LEFT JOIN (
  SELECT user_id, SUM(points_awarded) AS points FROM scored_hikes GROUP BY user_id
) hikes ON hikes.user_id = u.id
LEFT JOIN (
  SELECT user_id, SUM(points_awarded) AS points FROM scored_activities GROUP BY user_id
) activities ON activities.user_id = u.id
LEFT JOIN (
  SELECT user_id, SUM(points_awarded) AS points FROM scored_sightings GROUP BY user_id
) sightings ON sightings.user_id = u.id;
