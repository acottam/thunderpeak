-- Thunderpeak Database Schema
-- National Parks Adventure & Gamification System
-- Author: Arlin Jones
-- Sprint 1 Database Foundation

-- ============================================================================
-- USERS TABLE
-- Stores user profiles and authentication
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  fitness_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Note: Preferred activities removed per Sprint 1 requirements
-- Can be added as extension later if needed

-- ============================================================================
-- PARKS TABLE
-- Stores National Park information
-- ============================================================================
CREATE TABLE IF NOT EXISTS parks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VISITS TABLE
-- Records when a user visits a park
-- ============================================================================
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  park_id INTEGER NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  visited_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_park_id ON visits(park_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_park ON visits(user_id, park_id);

-- ============================================================================
-- HIKE DIFFICULTIES TABLE
-- Point values for hiking difficulty levels
-- ============================================================================
CREATE TABLE IF NOT EXISTS hike_difficulties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  base_points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VISIT HIKES TABLE
-- Records a single hike per difficulty level per visit
-- Enforces: Only 1 hike of each difficulty level per visit via unique constraint
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_hikes (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  hike_difficulty_id INTEGER NOT NULL REFERENCES hike_difficulties(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(visit_id, hike_difficulty_id)
);

CREATE INDEX IF NOT EXISTS idx_visit_hikes_visit_id ON visit_hikes(visit_id);

-- ============================================================================
-- ANIMALS TABLE
-- Species information with rarity/coolness multipliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS animals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  rarity_multiplier DECIMAL(3, 2) NOT NULL,
  base_points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VISIT ANIMAL SIGHTINGS TABLE
-- Records animals seen during a visit
-- Enforces: Each animal species can only be seen once per visit (unique constraint)
-- Multiplier from animals table determines point value
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_animal_sightings (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  animal_id INTEGER NOT NULL REFERENCES animals(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(visit_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_visit_animal_sightings_visit_id ON visit_animal_sightings(visit_id);

-- ============================================================================
-- ACTIVITIES TABLE
-- General activities (photography, camping, etc.) beyond hikes and sightings
-- ============================================================================
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  base_points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PARKS ACTIVITIES TABLE
-- Defines which activities are available at each park
-- Not all activities are available everywhere (e.g., horseback riding)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parks_activities (
  id SERIAL PRIMARY KEY,
  park_id INTEGER NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(park_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_parks_activities_park_id ON parks_activities(park_id);
CREATE INDEX IF NOT EXISTS idx_parks_activities_activity_id ON parks_activities(activity_id);

-- ============================================================================
-- VISIT ACTIVITIES TABLE
-- Records activities completed during a visit
-- API should validate that activity is available at that park via parks_activities
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_activities (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visit_activities_visit_id ON visit_activities(visit_id);

-- ============================================================================
-- End of Schema
-- Migration ready for Render PostgreSQL
-- ============================================================================
