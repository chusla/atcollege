-- atCollege Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (extends Supabase Auth users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    avatar_url TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    interests TEXT[] DEFAULT '{}',
    campus_id UUID,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    registration_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CAMPUSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    short_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    logo_url TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('academic', 'social', 'sports', 'cultural', 'career', 'workshop', 'other')),
    image_url TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    location TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    capacity INTEGER,
    registration_url TEXT,
    is_free BOOLEAN DEFAULT TRUE,
    price DECIMAL(10, 2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLACES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('restaurant', 'cafe', 'bar', 'gym', 'library', 'study_spot', 'recreation', 'shopping', 'service', 'other')),
    image_url TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    phone TEXT,
    website TEXT,
    hours JSONB,
    price_level INTEGER CHECK (price_level BETWEEN 1 AND 4),
    rating DECIMAL(2, 1),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- OPPORTUNITIES TABLE (Jobs, Internships, Volunteer)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('job', 'internship', 'volunteer', 'research', 'other')),
    organization TEXT,
    image_url TEXT,
    location TEXT,
    is_remote BOOLEAN DEFAULT FALSE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    application_url TEXT,
    deadline TIMESTAMPTZ,
    compensation TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTEREST GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interest_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image_url TEXT,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 0,
    is_official BOOLEAN DEFAULT FALSE,
    meeting_schedule TEXT,
    contact_email TEXT,
    website TEXT,
    social_links JSONB,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SAVED ITEMS TABLE (for user favorites/bookmarks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('event', 'place', 'opportunity', 'group')),
    item_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'place', 'opportunity', 'group')),
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_campus ON public.profiles(campus_id);
CREATE INDEX IF NOT EXISTS idx_events_campus ON public.events(campus_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_places_campus ON public.places(campus_id);
CREATE INDEX IF NOT EXISTS idx_places_status ON public.places(status);
CREATE INDEX IF NOT EXISTS idx_places_category ON public.places(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_campus ON public.opportunities(campus_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_interest_groups_campus ON public.interest_groups(campus_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_item ON public.saved_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON public.campuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON public.places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interest_groups_updated_at BEFORE UPDATE ON public.interest_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

