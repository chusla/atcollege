-- Row Level Security Policies for atCollege
-- Run this after schema.sql in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- CAMPUSES POLICIES
-- =====================================================
-- Anyone can view campuses
CREATE POLICY "Campuses are viewable by everyone" ON public.campuses
    FOR SELECT USING (true);

-- Only admins can modify campuses
CREATE POLICY "Admins can insert campuses" ON public.campuses
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update campuses" ON public.campuses
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can delete campuses" ON public.campuses
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- EVENTS POLICIES
-- =====================================================
-- Anyone can view approved events
CREATE POLICY "Approved events are viewable by everyone" ON public.events
    FOR SELECT USING (status = 'approved' OR organizer_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON public.events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own events or admins can update any
CREATE POLICY "Users can update own events" ON public.events
    FOR UPDATE USING (
        organizer_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can delete their own events or admins can delete any
CREATE POLICY "Users can delete own events" ON public.events
    FOR DELETE USING (
        organizer_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- PLACES POLICIES
-- =====================================================
-- Anyone can view approved places
CREATE POLICY "Approved places are viewable by everyone" ON public.places
    FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Authenticated users can create places
CREATE POLICY "Authenticated users can create places" ON public.places
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own places or admins can update any
CREATE POLICY "Users can update own places" ON public.places
    FOR UPDATE USING (
        submitted_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can delete their own places or admins can delete any
CREATE POLICY "Users can delete own places" ON public.places
    FOR DELETE USING (
        submitted_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- OPPORTUNITIES POLICIES
-- =====================================================
-- Anyone can view approved opportunities
CREATE POLICY "Approved opportunities are viewable by everyone" ON public.opportunities
    FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Authenticated users can create opportunities
CREATE POLICY "Authenticated users can create opportunities" ON public.opportunities
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own opportunities or admins can update any
CREATE POLICY "Users can update own opportunities" ON public.opportunities
    FOR UPDATE USING (
        submitted_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can delete their own opportunities or admins can delete any
CREATE POLICY "Users can delete own opportunities" ON public.opportunities
    FOR DELETE USING (
        submitted_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- INTEREST GROUPS POLICIES
-- =====================================================
-- Anyone can view approved groups
CREATE POLICY "Approved groups are viewable by everyone" ON public.interest_groups
    FOR SELECT USING (status = 'approved' OR created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" ON public.interest_groups
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own groups or admins can update any
CREATE POLICY "Users can update own groups" ON public.interest_groups
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can delete their own groups or admins can delete any
CREATE POLICY "Users can delete own groups" ON public.interest_groups
    FOR DELETE USING (
        created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- SAVED ITEMS POLICIES
-- =====================================================
-- Users can view their own saved items
CREATE POLICY "Users can view own saved items" ON public.saved_items
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own saved items
CREATE POLICY "Users can create own saved items" ON public.saved_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own saved items
CREATE POLICY "Users can delete own saved items" ON public.saved_items
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- COMMENTS POLICIES
-- =====================================================
-- Anyone can view comments
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments or admins can delete any
CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

