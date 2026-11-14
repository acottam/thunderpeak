-- Thunderpeak Database Seed Data
-- Populates base reference data for points system
-- Author: Arlin Jones
-- Note: Parks data will be imported by Godwin from NPS API

-- ============================================================================
-- HIKE DIFFICULTIES
-- Point values for each difficulty level
-- ============================================================================
INSERT INTO hike_difficulties (name, base_points, description) VALUES
  ('Easy', 5, 'Beginner-friendly trail, minimal elevation gain'),
  ('Moderate', 10, 'Intermediate trail, moderate elevation and distance'),
  ('Hard', 20, 'Challenging trail, significant elevation and/or distance');

-- ============================================================================
-- ANIMALS
-- Species with rarity multipliers and base point values
-- Multiplier applied to base_points for final score
-- Examples:
--   Common animal: multiplier 1.0 → 5 * 1.0 = 5 pts
--   Cool/rare animal: multiplier 2.5 → 5 * 2.5 = 12.5 pts
--   Apex predator/endangered: multiplier 3.0+ → 5 * 3.0+ = 15+ pts
-- ============================================================================
INSERT INTO animals (name, rarity_multiplier, base_points, description) VALUES
  -- Apex Predators & Endangered (High Value)
  ('Gray Wolf', 3.5, 10, 'Rare apex predator, iconic wildlife'),
  ('Grizzly Bear', 3.5, 10, 'Endangered apex predator, thrilling sighting'),
  ('Mountain Lion', 3.0, 10, 'Elusive big cat, challenging to spot'),
  
  -- Rare & Notable (Medium-High Value)
  ('Bald Eagle', 2.5, 8, 'Majestic raptor, recovering endangered species'),
  ('Bighorn Sheep', 2.5, 8, 'Rugged mountain dweller'),
  ('Moose', 2.5, 8, 'Large impressive herbivore'),
  
  -- Moderately Common (Medium Value)
  ('Black Bear', 2.0, 7, 'Common in many parks, impressive to see'),
  ('Elk', 2.0, 7, 'Large herd animal, bugling in fall'),
  ('Mule Deer', 1.8, 6, 'Common big game animal'),
  ('Coyote', 1.8, 6, 'Widespread canine, often heard or seen'),
  
  -- Common Wildlife (Low-Medium Value)
  ('White-tailed Deer', 1.5, 5, 'Very common across parks'),
  ('Pronghorn', 1.5, 5, 'Fast prairie animal'),
  ('Bobcat', 1.7, 6, 'Elusive wild cat'),
  ('Squirrel', 1.0, 2, 'Common small mammal'),
  ('Rabbit', 1.0, 2, 'Common hopper'),
  
  -- Common Birds (Low Value)
  ('Raven', 1.2, 3, 'Intelligent corvid'),
  ('Hawk', 1.5, 5, 'Common raptor'),
  ('Blue Jay', 1.0, 2, 'Vocal woodland bird'),
  ('Turkey Vulture', 1.2, 3, 'Soaring scavenger');

-- ============================================================================
-- ACTIVITIES
-- General outdoor activities with base point values
-- ============================================================================
INSERT INTO activities (name, base_points, description) VALUES
  ('Photography', 3, 'Capture scenic photos and wildlife'),
  ('Camping', 8, 'Overnight camping adventure'),
  ('Birdwatching', 4, 'Dedicated bird observation and identification'),
  ('Geological Exploration', 5, 'Study rock formations and geological features'),
  ('Backcountry Travel', 10, 'Off-trail wilderness adventure'),
  ('Historical Site Visit', 3, 'Visit and learn about historic locations'),
  ('Stargazing', 5, 'Observe night sky and astronomy'),
  ('Wildflower Identification', 4, 'Document and identify wildflowers'),
  ('Horseback Riding', 7, 'Explore park trails on horseback (limited availability)'),
  ('Fishing', 6, 'Fly fishing or general angling in park waters');

-- ============================================================================
-- End of Seed Data
-- Parks and user records will be populated separately
-- Parks_activities will be populated after parks are imported from NPS API
-- Example: Only certain parks allow horseback riding, fishing, etc.
-- ============================================================================
