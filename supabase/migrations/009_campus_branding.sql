-- Add branding fields to campuses table
-- Allows storing school colors, logos, and Google Place ID

-- Add new columns to campuses table
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS secondary_color TEXT;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add index for google_place_id lookups
CREATE INDEX IF NOT EXISTS idx_campuses_google_place_id ON campuses(google_place_id);

-- Add comments for documentation
COMMENT ON COLUMN campuses.google_place_id IS 'Google Places API place ID for the campus';
COMMENT ON COLUMN campuses.primary_color IS 'Primary school color in hex format (e.g., #00693E for Dartmouth green)';
COMMENT ON COLUMN campuses.secondary_color IS 'Secondary school color in hex format';
COMMENT ON COLUMN campuses.logo_url IS 'URL to the school logo image';
