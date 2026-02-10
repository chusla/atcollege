-- Migration: Add location fields to interest_groups table
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)

-- Add latitude column (nullable - not all groups have a physical location)
ALTER TABLE interest_groups
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

-- Add longitude column
ALTER TABLE interest_groups
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add location/address text column
ALTER TABLE interest_groups
ADD COLUMN IF NOT EXISTS location TEXT;

-- Optional: Add an index for geographic queries if needed later
-- CREATE INDEX IF NOT EXISTS idx_interest_groups_location
--   ON interest_groups (latitude, longitude)
--   WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
