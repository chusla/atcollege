-- ============================================
-- ADD GOOGLE PLACES FIELDS TO PLACES TABLE
-- Run this after 004_fix_profiles_schema.sql
-- ============================================

-- First, update the source check constraint to allow 'google_maps'
ALTER TABLE places 
  DROP CONSTRAINT IF EXISTS places_source_check;

ALTER TABLE places 
  ADD CONSTRAINT places_source_check 
  CHECK (source IN ('ai_suggested', 'user_submitted', 'admin', 'google_maps'));

-- Add Google Places fields to places table
ALTER TABLE places 
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS google_place_data JSONB,
  ADD COLUMN IF NOT EXISTS categorization_status TEXT DEFAULT 'pending' CHECK (categorization_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS llm_category TEXT,
  ADD COLUMN IF NOT EXISTS llm_category_confidence DECIMAL(3, 2) CHECK (llm_category_confidence >= 0 AND llm_category_confidence <= 1),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_categorized_at TIMESTAMPTZ;

-- Create index on google_place_id for fast lookups and deduplication
CREATE INDEX IF NOT EXISTS idx_places_google_place_id ON places(google_place_id);

-- Create index on categorization_status for filtering
CREATE INDEX IF NOT EXISTS idx_places_categorization_status ON places(categorization_status);

-- Create index on source for filtering Google Maps imports
CREATE INDEX IF NOT EXISTS idx_places_source ON places(source);

-- Add comment to document the fields
COMMENT ON COLUMN places.google_place_id IS 'Unique Google Places API place_id for deduplication';
COMMENT ON COLUMN places.google_place_data IS 'Full Google Places API response stored as JSONB for reference';
COMMENT ON COLUMN places.categorization_status IS 'Status of LLM categorization: pending, processing, completed, failed';
COMMENT ON COLUMN places.llm_category IS 'Category suggested by LLM (separate from manual category field)';
COMMENT ON COLUMN places.llm_category_confidence IS 'Confidence score from LLM (0.0 to 1.0)';
COMMENT ON COLUMN places.imported_at IS 'Timestamp when place was imported from Google Maps';
COMMENT ON COLUMN places.last_categorized_at IS 'Timestamp of last LLM categorization attempt';

