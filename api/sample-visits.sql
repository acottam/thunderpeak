-- Local or disposable test databases only. These users cannot log in.
INSERT INTO users (username, password_hash) VALUES
  ('sample_arlin', 'disabled'),
  ('sample_jordan', 'disabled')
ON CONFLICT (username) DO NOTHING;

INSERT INTO parks (name, park_code, designation, point_value) VALUES
  ('Sample Mountain National Park', 'sample-mountain', 'National Park', 50),
  ('Sample Canyon National Monument', 'sample-canyon', 'National Monument', 15)
ON CONFLICT (name) DO NOTHING;

INSERT INTO visits (user_id, park_id, visited_date)
SELECT u.id, p.id, sample.visited_date::date
FROM (VALUES
  ('sample_arlin', 'Sample Mountain National Park', DATE '2024-01-15'),
  ('sample_arlin', 'Sample Mountain National Park', DATE '2024-06-15'),
  ('sample_arlin', 'Sample Mountain National Park', DATE '2025-01-15'),
  ('sample_arlin', 'Sample Canyon National Monument', DATE '2025-03-15'),
  ('sample_jordan', 'Sample Canyon National Monument', DATE '2025-04-15')
) AS sample(username, park_name, visited_date)
JOIN users u ON u.username = sample.username
JOIN parks p ON p.name = sample.park_name
WHERE NOT EXISTS (
  SELECT 1 FROM visits v
  WHERE v.user_id = u.id AND v.park_id = p.id AND v.visited_date = sample.visited_date::date
);
