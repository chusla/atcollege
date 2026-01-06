-- ============================================
-- PLACES CATEGORIZATION FUNCTIONS
-- Run this after 005_add_google_places_fields.sql
-- ============================================

-- Function to get uncategorized places
CREATE OR REPLACE FUNCTION get_uncategorized_places(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  name TEXT,
  google_place_id TEXT,
  categorization_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.google_place_id,
    p.categorization_status
  FROM places p
  WHERE p.source = 'google_maps'
    AND p.categorization_status IN ('pending', 'failed')
  ORDER BY p.imported_at ASC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update place categorization status
CREATE OR REPLACE FUNCTION update_place_category(
  place_id UUID,
  new_status TEXT,
  llm_category_value TEXT DEFAULT NULL,
  confidence_value DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE places
  SET 
    categorization_status = new_status,
    llm_category = COALESCE(llm_category_value, llm_category),
    llm_category_confidence = COALESCE(confidence_value, llm_category_confidence),
    last_categorized_at = NOW()
  WHERE id = place_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get places by categorization status
CREATE OR REPLACE FUNCTION get_places_by_categorization_status(
  status_filter TEXT,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  llm_category TEXT,
  categorization_status TEXT,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.category,
    p.llm_category,
    p.categorization_status,
    p.source
  FROM places p
  WHERE p.categorization_status = status_filter
  ORDER BY p.last_categorized_at DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION get_uncategorized_places IS 'Returns places that need LLM categorization';
COMMENT ON FUNCTION update_place_category IS 'Updates place categorization status and LLM results';
COMMENT ON FUNCTION get_places_by_categorization_status IS 'Returns places filtered by categorization status';

