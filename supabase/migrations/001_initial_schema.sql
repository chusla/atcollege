-- atCollege Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  first_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  interests TEXT[] DEFAULT '{}',
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  selected_campus_id UUID,
  selected_campus_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAMPUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('Sports', 'Shows', 'Talks', 'Social', 'Academic', 'Other')),
  location TEXT,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  image_url TEXT,
  date DATE NOT NULL,
  time TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  source TEXT DEFAULT 'user_submitted' CHECK (source IN ('ai_suggested', 'user_submitted', 'admin')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('Bars', 'Restaurants', 'Cafes', 'Housing', 'Study Spots', 'Entertainment', 'Shopping', 'Other')),
  address TEXT,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
  distance_miles DECIMAL(5, 2),
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  source TEXT DEFAULT 'user_submitted' CHECK (source IN ('ai_suggested', 'user_submitted', 'admin')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OPPORTUNITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('Volunteer', 'Work', 'Internship', 'Research', 'Other')),
  organization TEXT,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  image_url TEXT,
  location TEXT,
  deadline DATE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  source TEXT DEFAULT 'user_submitted' CHECK (source IN ('ai_suggested', 'user_submitted', 'admin')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTEREST GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS interest_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  member_count INTEGER DEFAULT 0,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  source TEXT DEFAULT 'user_submitted' CHECK (source IN ('ai_suggested', 'user_submitted', 'admin')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAVED ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('event', 'place', 'opportunity', 'group')),
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('event', 'place', 'opportunity', 'group')),
  item_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_campus ON events(campus_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

CREATE INDEX IF NOT EXISTS idx_places_campus ON places(campus_id);
CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);

CREATE INDEX IF NOT EXISTS idx_opportunities_campus ON opportunities(campus_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);

CREATE INDEX IF NOT EXISTS idx_interest_groups_campus ON interest_groups(campus_id);
CREATE INDEX IF NOT EXISTS idx_interest_groups_status ON interest_groups(status);

CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_item ON saved_items(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_profiles_campus ON profiles(selected_campus_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- CAMPUSES policies (public read, admin write)
CREATE POLICY "Campuses are viewable by everyone" ON campuses
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert campuses" ON campuses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update campuses" ON campuses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete campuses" ON campuses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- EVENTS policies
CREATE POLICY "Approved events are viewable by everyone" ON events
  FOR SELECT USING (status = 'approved' OR created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own events or admins can update any" ON events
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete own events or admins can delete any" ON events
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PLACES policies
CREATE POLICY "Approved places are viewable by everyone" ON places
  FOR SELECT USING (status = 'approved' OR created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can create places" ON places
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own places or admins can update any" ON places
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete own places or admins can delete any" ON places
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- OPPORTUNITIES policies
CREATE POLICY "Approved opportunities are viewable by everyone" ON opportunities
  FOR SELECT USING (status = 'approved' OR created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can create opportunities" ON opportunities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own opportunities or admins can update any" ON opportunities
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete own opportunities or admins can delete any" ON opportunities
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INTEREST GROUPS policies
CREATE POLICY "Approved groups are viewable by everyone" ON interest_groups
  FOR SELECT USING (status = 'approved' OR created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can create groups" ON interest_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own groups or admins can update any" ON interest_groups
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete own groups or admins can delete any" ON interest_groups
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SAVED ITEMS policies
CREATE POLICY "Users can view own saved items" ON saved_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can save items" ON saved_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved items" ON saved_items
  FOR DELETE USING (user_id = auth.uid());

-- COMMENTS policies
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments or admins can delete any" ON comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON campuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interest_groups_updated_at BEFORE UPDATE ON interest_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Sample campuses)
-- ============================================
INSERT INTO campuses (name, location, latitude, longitude) VALUES
  ('Rice University', 'Houston, TX', 29.7174, -95.4018),
  ('University of Houston', 'Houston, TX', 29.7199, -95.3422),
  ('Texas A&M University', 'College Station, TX', 30.6187, -96.3365),
  ('University of Texas at Austin', 'Austin, TX', 30.2849, -97.7341),
  ('Stanford University', 'Stanford, CA', 37.4275, -122.1697),
  ('MIT', 'Cambridge, MA', 42.3601, -71.0942),
  ('Harvard University', 'Cambridge, MA', 42.3770, -71.1167),
  ('UCLA', 'Los Angeles, CA', 34.0689, -118.4452),
  ('UC Berkeley', 'Berkeley, CA', 37.8719, -122.2585),
  ('Columbia University', 'New York, NY', 40.8075, -73.9626)
ON CONFLICT DO NOTHING;

