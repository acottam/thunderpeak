ALTER TABLE parks
  ADD COLUMN IF NOT EXISTS park_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS designation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6) CHECK (latitude BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6) CHECK (longitude BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS point_value INTEGER CHECK (point_value >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parks_park_code ON parks(park_code);

-- Recalculate awards in visit-date order, including when a visit is backdated.
CREATE OR REPLACE VIEW scored_visits AS
WITH RECURSIVE ordered_visits AS (
  SELECT v.*,
    ROW_NUMBER() OVER (
      PARTITION BY v.user_id, v.park_id ORDER BY v.visited_date, v.id
    ) AS visit_number
  FROM visits v
),
awards AS (
  SELECT v.id, v.user_id, v.park_id, v.visited_date, v.visit_number,
    v.visited_date AS last_awarded_date, TRUE AS earns_points
  FROM ordered_visits v
  WHERE v.visit_number = 1

  UNION ALL

  SELECT v.id, v.user_id, v.park_id, v.visited_date, v.visit_number,
    CASE
      WHEN v.visited_date >= (a.last_awarded_date + INTERVAL '12 months')::date
        THEN v.visited_date
      ELSE a.last_awarded_date
    END,
    v.visited_date >= (a.last_awarded_date + INTERVAL '12 months')::date
  FROM awards a
  JOIN ordered_visits v
    ON v.user_id = a.user_id AND v.park_id = a.park_id
    AND v.visit_number = a.visit_number + 1
)
SELECT a.id, a.user_id, a.park_id, a.visited_date, a.earns_points,
  CASE WHEN a.earns_points THEN COALESCE(p.point_value, 0) ELSE 0 END AS points_awarded
FROM awards a
JOIN parks p ON p.id = a.park_id;

-- Migration 002 owns the expanded view once it has been applied.
DO $$
BEGIN
IF to_regclass('scored_hikes') IS NULL THEN
EXECUTE $view$
CREATE OR REPLACE VIEW user_scores AS
SELECT u.id AS user_id, u.username,
  COUNT(v.id) AS visit_count,
  COALESCE(SUM(v.points_awarded), 0) AS total_points
FROM users u
LEFT JOIN scored_visits v ON v.user_id = u.id
GROUP BY u.id, u.username
$view$;
END IF;
END $$;
