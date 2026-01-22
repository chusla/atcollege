-- Entity Images - Multiple images per listing with primary flag
-- Supports Places, Events, Opportunities, Interest Groups

-- ============================================
-- ENTITY IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS entity_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Polymorphic reference to any entity
  entity_type TEXT NOT NULL CHECK (entity_type IN ('place', 'event', 'opportunity', 'interest_group', 'campus')),
  entity_id UUID NOT NULL,
  
  -- Image data
  image_url TEXT NOT NULL,
  storage_path TEXT, -- If uploaded to Supabase Storage (e.g., 'uploads/places/abc123.jpg')
  
  -- Metadata
  caption TEXT,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  
  -- Source tracking
  source TEXT DEFAULT 'admin' CHECK (source IN ('admin', 'user', 'google_maps', 'import', 'ai_generated')),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITE SETTINGS TABLE
-- For configurable items like hero images, landing page settings
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_entity_images_entity ON entity_images(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_images_primary ON entity_images(entity_type, entity_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Ensure only one primary image per entity
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    -- Set all other images for this entity to non-primary
    UPDATE entity_images
    SET is_primary = FALSE
    WHERE entity_type = NEW.entity_type 
      AND entity_id = NEW.entity_id 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_image_trigger
BEFORE INSERT OR UPDATE ON entity_images
FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_image();

-- Update updated_at timestamp
CREATE TRIGGER update_entity_images_updated_at BEFORE UPDATE ON entity_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE entity_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Entity images policies
CREATE POLICY "Entity images are viewable by everyone" ON entity_images
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add images to their own content" ON entity_images
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Admins can add images to anything
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      OR
      -- Users can add images to their own content
      uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own images or admins can update any" ON entity_images
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete own images or admins can delete any" ON entity_images
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Site settings policies (admin only for write)
CREATE POLICY "Site settings are viewable by everyone" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert site settings" ON site_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update site settings" ON site_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete site settings" ON site_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- SEED DEFAULT SITE SETTINGS
-- ============================================
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
  ('hero_image', '{"url": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920", "alt": "Campus", "source": "unsplash"}', 'Landing page hero background image'),
  ('landing_page', '{"title": "Discover Your Campus Life", "subtitle": "Find events, places, opportunities, and connect with students who share your interests.", "stats": {"events": "100+", "places": "50+", "groups": "20+"}}', 'Landing page content configuration')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Get primary image URL for an entity
-- Falls back to image_url column if no entity_images exist
-- ============================================
CREATE OR REPLACE FUNCTION get_entity_primary_image(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_image_url TEXT;
BEGIN
  -- First try to get primary image from entity_images
  SELECT image_url INTO v_image_url
  FROM entity_images
  WHERE entity_type = p_entity_type 
    AND entity_id = p_entity_id
    AND is_primary = TRUE
  LIMIT 1;
  
  IF v_image_url IS NOT NULL THEN
    RETURN v_image_url;
  END IF;
  
  -- Fall back to first image by sort order
  SELECT image_url INTO v_image_url
  FROM entity_images
  WHERE entity_type = p_entity_type 
    AND entity_id = p_entity_id
  ORDER BY sort_order, created_at
  LIMIT 1;
  
  IF v_image_url IS NOT NULL THEN
    RETURN v_image_url;
  END IF;
  
  -- Fall back to legacy image_url column on the entity table
  CASE p_entity_type
    WHEN 'place' THEN
      SELECT image_url INTO v_image_url FROM places WHERE id = p_entity_id;
    WHEN 'event' THEN
      SELECT image_url INTO v_image_url FROM events WHERE id = p_entity_id;
    WHEN 'opportunity' THEN
      SELECT image_url INTO v_image_url FROM opportunities WHERE id = p_entity_id;
    WHEN 'interest_group' THEN
      SELECT image_url INTO v_image_url FROM interest_groups WHERE id = p_entity_id;
    WHEN 'campus' THEN
      SELECT image_url INTO v_image_url FROM campuses WHERE id = p_entity_id;
  END CASE;
  
  RETURN v_image_url;
END;
$$ LANGUAGE plpgsql;
