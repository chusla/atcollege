-- IdealToolkit Assessment Platform - Row Level Security Policies
-- Run this AFTER schema.sql in your Supabase SQL Editor

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND primary_role = 'app_admin'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Check if user is a coach
CREATE OR REPLACE FUNCTION is_coach(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND primary_role = 'coach'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Check if user is an employer
CREATE OR REPLACE FUNCTION is_employer(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND primary_role = 'employer'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Check if user belongs to same organization
CREATE OR REPLACE FUNCTION same_organization(user_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = user_id AND p2.id = target_user_id
        AND p1.organization_id IS NOT NULL
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (is_admin(auth.uid()));

-- Coaches can view profiles in their organization
CREATE POLICY "Coaches can view org profiles"
    ON public.profiles FOR SELECT
    USING (
        is_coach(auth.uid()) AND 
        same_organization(auth.uid(), id)
    );

-- Employers can view profiles in their organization
CREATE POLICY "Employers can view org profiles"
    ON public.profiles FOR SELECT
    USING (
        is_employer(auth.uid()) AND 
        same_organization(auth.uid(), id)
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (is_admin(auth.uid()));

-- =====================================================
-- ORGANIZATIONS POLICIES
-- =====================================================

-- Anyone authenticated can view organizations
CREATE POLICY "Authenticated users can view organizations"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (true);

-- Admins can manage organizations
CREATE POLICY "Admins can insert organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update organizations"
    ON public.organizations FOR UPDATE
    USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete organizations"
    ON public.organizations FOR DELETE
    USING (is_admin(auth.uid()));

-- =====================================================
-- ADMIN ACCOUNTS POLICIES
-- =====================================================

-- Users can view their own admin account
CREATE POLICY "Users can view own admin account"
    ON public.admin_accounts FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all admin accounts
CREATE POLICY "Admins can view all admin accounts"
    ON public.admin_accounts FOR SELECT
    USING (is_admin(auth.uid()));

-- Only super admins can manage admin accounts
CREATE POLICY "Super admins can manage admin accounts"
    ON public.admin_accounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_accounts
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

-- =====================================================
-- MODELS & ASSESSMENT CONTENT POLICIES
-- =====================================================

-- Published models are viewable by all authenticated users
CREATE POLICY "Published models viewable by all"
    ON public.models FOR SELECT
    TO authenticated
    USING (model_status = 'published' OR is_admin(auth.uid()));

-- Admins can manage all models
CREATE POLICY "Admins can manage models"
    ON public.models FOR ALL
    USING (is_admin(auth.uid()));

-- Pillars follow model visibility
CREATE POLICY "Pillars viewable with model"
    ON public.pillars FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.models
            WHERE id = pillars.model_id
            AND (model_status = 'published' OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage pillars"
    ON public.pillars FOR ALL
    USING (is_admin(auth.uid()));

-- Competencies follow model visibility
CREATE POLICY "Competencies viewable with model"
    ON public.competencies FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.models
            WHERE id = competencies.model_id
            AND (model_status = 'published' OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage competencies"
    ON public.competencies FOR ALL
    USING (is_admin(auth.uid()));

-- Indicators follow model visibility
CREATE POLICY "Indicators viewable with model"
    ON public.indicators FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.models
            WHERE id = indicators.model_id
            AND (model_status = 'published' OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage indicators"
    ON public.indicators FOR ALL
    USING (is_admin(auth.uid()));

-- =====================================================
-- ASSESSMENTS POLICIES
-- =====================================================

-- Published assessments viewable by all authenticated users
CREATE POLICY "Published assessments viewable by all"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (assessment_status = 'published' OR is_admin(auth.uid()));

-- Admins can manage all assessments
CREATE POLICY "Admins can manage assessments"
    ON public.assessments FOR ALL
    USING (is_admin(auth.uid()));

-- Assessment pages follow assessment visibility
CREATE POLICY "Assessment pages viewable with assessment"
    ON public.assessment_pages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE id = assessment_pages.assessment_id
            AND (assessment_status = 'published' OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage assessment pages"
    ON public.assessment_pages FOR ALL
    USING (is_admin(auth.uid()));

-- Assessment sections follow assessment visibility
CREATE POLICY "Assessment sections viewable with assessment"
    ON public.assessment_sections FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE id = assessment_sections.assessment_id
            AND (assessment_status = 'published' OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage assessment sections"
    ON public.assessment_sections FOR ALL
    USING (is_admin(auth.uid()));

-- Questions follow assessment visibility
CREATE POLICY "Questions viewable with assessment"
    ON public.questions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE id = questions.assessment_id
            AND (assessment_status = 'published' OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage questions"
    ON public.questions FOR ALL
    USING (is_admin(auth.uid()));

-- Question options follow question visibility
CREATE POLICY "Question options viewable with question"
    ON public.question_options FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.assessments a ON q.assessment_id = a.id
            WHERE q.id = question_options.question_id
            AND (a.assessment_status = 'published' OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage question options"
    ON public.question_options FOR ALL
    USING (is_admin(auth.uid()));

-- =====================================================
-- ASSESSMENT RECORDS & RESPONSES POLICIES
-- =====================================================

-- Users can view their own assessment records
CREATE POLICY "Users can view own assessment records"
    ON public.assessment_records FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view records where they are the target (360)
CREATE POLICY "Users can view records targeting them"
    ON public.assessment_records FOR SELECT
    USING (auth.uid() = target_user_id);

-- Admins can view all assessment records
CREATE POLICY "Admins can view all assessment records"
    ON public.assessment_records FOR SELECT
    USING (is_admin(auth.uid()));

-- Coaches can view their clients' assessment records
CREATE POLICY "Coaches can view client records"
    ON public.assessment_records FOR SELECT
    USING (
        is_coach(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.client_accounts
            WHERE user_id = assessment_records.user_id
            AND assigned_coach_id = auth.uid()
        )
    );

-- Users can create their own assessment records
CREATE POLICY "Users can create own assessment records"
    ON public.assessment_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own in-progress records
CREATE POLICY "Users can update own assessment records"
    ON public.assessment_records FOR UPDATE
    USING (auth.uid() = user_id AND record_status IN ('not_started', 'in_progress'));

-- Question responses follow assessment record access
CREATE POLICY "Users can view own question responses"
    ON public.question_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_records
            WHERE id = question_responses.assessment_record_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all question responses"
    ON public.question_responses FOR SELECT
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can create own question responses"
    ON public.question_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessment_records
            WHERE id = question_responses.assessment_record_id
            AND user_id = auth.uid()
            AND record_status = 'in_progress'
        )
    );

CREATE POLICY "Users can update own question responses"
    ON public.question_responses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_records
            WHERE id = question_responses.assessment_record_id
            AND user_id = auth.uid()
            AND record_status = 'in_progress'
        )
    );

-- =====================================================
-- SCORING POLICIES
-- =====================================================

-- Scoring scales are viewable by all authenticated users
CREATE POLICY "Scoring scales viewable by all"
    ON public.scoring_scales FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage scoring scales"
    ON public.scoring_scales FOR ALL
    USING (is_admin(auth.uid()));

-- Scoring records follow assessment record access
CREATE POLICY "Users can view own scoring records"
    ON public.scoring_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_records
            WHERE id = scoring_records.assessment_record_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all scoring records"
    ON public.scoring_records FOR SELECT
    USING (is_admin(auth.uid()));

-- Benchmark scores are viewable by all authenticated users
CREATE POLICY "Benchmark scores viewable by all"
    ON public.benchmark_scores FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage benchmark scores"
    ON public.benchmark_scores FOR ALL
    USING (is_admin(auth.uid()));

-- =====================================================
-- SUBSCRIPTION POLICIES
-- =====================================================

-- Subscription plans are viewable by all authenticated users
CREATE POLICY "Subscription plans viewable by all"
    ON public.subscription_plans FOR SELECT
    TO authenticated
    USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage subscription plans"
    ON public.subscription_plans FOR ALL
    USING (is_admin(auth.uid()));

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions FOR SELECT
    USING (is_admin(auth.uid()));

-- Users can view their own entitlements
CREATE POLICY "Users can view own entitlements"
    ON public.entitlements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage entitlements"
    ON public.entitlements FOR ALL
    USING (is_admin(auth.uid()));

-- =====================================================
-- INVITATIONS POLICIES
-- =====================================================

-- Users can view invitations they sent or received
CREATE POLICY "Users can view related invitations"
    ON public.invitations FOR SELECT
    USING (
        auth.uid() = invited_by_id OR
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can create invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (auth.uid() = invited_by_id);

CREATE POLICY "Admins can manage all invitations"
    ON public.invitations FOR ALL
    USING (is_admin(auth.uid()));

-- =====================================================
-- MESSAGING POLICIES
-- =====================================================

-- Users can view conversations they're part of
CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = ANY(participant_ids));

-- Users can create conversations
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = ANY(participant_ids));

-- Users can view messages in their conversations
CREATE POLICY "Users can view conversation messages"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = messages.conversation_id
            AND auth.uid() = ANY(participant_ids)
        )
    );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = messages.conversation_id
            AND auth.uid() = ANY(participant_ids)
        )
    );

-- =====================================================
-- APP CONFIG POLICIES
-- =====================================================

-- App config is readable by all authenticated users
CREATE POLICY "App config readable by all"
    ON public.app_config FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage app config"
    ON public.app_config FOR ALL
    USING (is_admin(auth.uid()));

-- =====================================================
-- FILES POLICIES
-- =====================================================

-- Users can view public files or their own files
CREATE POLICY "Users can view files"
    ON public.files FOR SELECT
    USING (is_public = true OR auth.uid() = uploaded_by);

CREATE POLICY "Users can upload files"
    ON public.files FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own files"
    ON public.files FOR DELETE
    USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all files"
    ON public.files FOR ALL
    USING (is_admin(auth.uid()));
