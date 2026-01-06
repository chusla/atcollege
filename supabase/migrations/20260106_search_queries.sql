-- Create search_queries table to track search history for analytics
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  category TEXT DEFAULT 'all',
  radius_miles NUMERIC DEFAULT 5,
  latitude NUMERIC,
  longitude NUMERIC,
  results_count INTEGER DEFAULT 0,
  place_ids TEXT[], -- Array of place IDs returned
  search_source TEXT DEFAULT 'home', -- 'home', 'places', 'events', etc.
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_campus ON search_queries(campus_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_text ON search_queries(query_text);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries(created_at DESC);

-- RLS policies
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Users can view their own searches
CREATE POLICY "Users can view own searches" ON search_queries
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can create searches
CREATE POLICY "Users can create searches" ON search_queries
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own searches
CREATE POLICY "Users can update own searches" ON search_queries
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Admins can view all searches (for analytics)
CREATE POLICY "Admins can view all searches" ON search_queries
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

