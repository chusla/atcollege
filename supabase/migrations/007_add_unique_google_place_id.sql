-- ============================================
-- ADD UNIQUE CONSTRAINT ON google_place_id
-- Prevents duplicate places from being imported
-- ============================================

-- First, remove any duplicate google_place_ids (keep the most recent one)
-- This query identifies duplicates and keeps only the newest one
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY google_place_id 
      ORDER BY imported_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM places
  WHERE google_place_id IS NOT NULL
)
DELETE FROM places
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint on google_place_id
-- This will prevent future duplicates
ALTER TABLE places 
  ADD CONSTRAINT places_google_place_id_unique 
  UNIQUE (google_place_id);

-- Add comment
COMMENT ON CONSTRAINT places_google_place_id_unique ON places IS 'Ensures each Google Place can only be imported once';

