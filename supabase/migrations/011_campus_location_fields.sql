-- Add location detail fields to campuses table
-- Allows storing city, state, and short_name separately for better organization

-- Add new columns to campuses table
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS state TEXT;

-- Add index for state for filtering
CREATE INDEX IF NOT EXISTS idx_campuses_state ON campuses(state);

-- Add comments for documentation
COMMENT ON COLUMN campuses.short_name IS 'Abbreviated name for the campus (e.g., MIT, UCLA)';
COMMENT ON COLUMN campuses.city IS 'City where the campus is located';
COMMENT ON COLUMN campuses.state IS 'State abbreviation (e.g., GA, CA, NY)';

-- Update existing campuses to extract city/state from location field if possible
-- This is a best-effort migration; some may need manual adjustment
UPDATE campuses 
SET 
  city = TRIM(SPLIT_PART(location, ',', 1)),
  state = TRIM(SPLIT_PART(location, ',', 2))
WHERE location IS NOT NULL 
  AND location LIKE '%,%'
  AND city IS NULL;
