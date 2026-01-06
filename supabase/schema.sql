-- IdealToolkit Assessment Platform - Complete Database Schema
-- Migrated from Bubble.io to Supabase
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- ENUMS (Option Sets from Bubble)
-- =====================================================

-- User role types
CREATE TYPE participant_role AS ENUM ('app_admin', 'individual', 'employer', 'coach');

-- Content status
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');

-- Record/Assessment status
CREATE TYPE record_status AS ENUM ('not_started', 'in_progress', 'completed', 'expired');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');

-- Entitlement status
CREATE TYPE entitlement_status AS ENUM ('active', 'used', 'expired', 'revoked');

-- Invite status
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Question types
CREATE TYPE question_type AS ENUM ('likert', 'multiple_choice', 'open_text', 'ranking', 'profile_field', 'slider');

-- Assessment types
CREATE TYPE assessment_type AS ENUM ('self', '360', 'team', 'organization');

-- Feedback types
CREATE TYPE feedback_type AS ENUM ('peer', 'manager', 'direct_report', 'self', 'external');

-- Scoring algorithm types
CREATE TYPE scoring_algorithm AS ENUM ('average', 'weighted', 'sum', 'custom');

-- Distribution types
CREATE TYPE distribution_type AS ENUM ('normal', 'percentile', 'raw');

-- =====================================================
-- CORE USER TABLES
-- =====================================================

-- Profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    user_firstname TEXT,
    user_lastname TEXT,
    user_username TEXT,
    user_phone_number TEXT,
    user_profile_image TEXT,
    user_locale TEXT DEFAULT 'en',
    user_time_zone TEXT DEFAULT 'UTC',
    
    -- Address fields
    user_address_street_line_1 TEXT,
    user_address_street_line_2 TEXT,
    user_address_city TEXT,
    user_address_state_province TEXT,
    user_address_postal_code TEXT,
    user_address_country TEXT,
    
    -- Role and status
    primary_role participant_role DEFAULT 'individual',
    user_profile_color TEXT,
    completed_first_assessment BOOLEAN DEFAULT FALSE,
    
    -- Linked accounts
    organization_id UUID,
    user_invited_by UUID REFERENCES public.profiles(id),
    
    -- Feed/Activity tracking
    feed_active_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_name TEXT NOT NULL,
    org_website TEXT,
    org_logo TEXT,
    org_logo_banner TEXT,
    org_logo_width INTEGER,
    org_logo_height INTEGER,
    org_color_primary TEXT,
    org_color_highlight TEXT,
    org_address_text TEXT,
    org_address_geo JSONB, -- {lat, lng, formatted_address}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin accounts (linked to profiles)
CREATE TABLE IF NOT EXISTS public.admin_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_permissions JSONB DEFAULT '[]',
    admin_notes TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Client accounts (for individual assessment takers)
CREATE TABLE IF NOT EXISTS public.client_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_notes TEXT,
    
    -- Linked coach/organization
    assigned_coach_id UUID,
    client_organization_id UUID REFERENCES public.organizations(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Coach companies
CREATE TABLE IF NOT EXISTS public.coach_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    company_website TEXT,
    company_logo TEXT,
    company_description TEXT,
    company_color_primary TEXT,
    company_color_secondary TEXT,
    
    -- Contact info
    contact_email TEXT,
    contact_phone TEXT,
    
    -- Owner
    owner_id UUID REFERENCES public.profiles(id),
    organization_id UUID REFERENCES public.organizations(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ASSESSMENT CONTENT STRUCTURE
-- =====================================================

-- Leadership/Assessment Models
CREATE TABLE IF NOT EXISTS public.models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    description TEXT,
    model_source_text TEXT,
    model_admin_notes TEXT,
    model_status content_status DEFAULT 'draft',
    popular_model BOOLEAN DEFAULT FALSE,
    
    -- Naming conventions
    alternate_pillar_name TEXT DEFAULT 'pillar',
    alternate_comp_name TEXT DEFAULT 'competency',
    alternate_item_name TEXT DEFAULT 'item',
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model types (categories within models)
CREATE TABLE IF NOT EXISTS public.model_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    type_name TEXT NOT NULL,
    type_description TEXT,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pillars (Level 3 - top level categories)
CREATE TABLE IF NOT EXISTS public.pillars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    pillar_name TEXT NOT NULL,
    pillar_description TEXT,
    pillar_short_name TEXT,
    pillar_color TEXT,
    pillar_icon TEXT,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competencies (Level 2 - mid level groupings)
CREATE TABLE IF NOT EXISTS public.competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pillar_id UUID NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
    competency_name TEXT NOT NULL,
    competency_description TEXT,
    competency_short_name TEXT,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indicators/Items (Level 1 - individual assessment items)
CREATE TABLE IF NOT EXISTS public.indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
    pillar_id UUID REFERENCES public.pillars(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
    
    item_text TEXT NOT NULL,
    item_description TEXT,
    item_short_text TEXT,
    reverse_scored BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    item_keywords TEXT[],
    item_source TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item keywords (for categorization/tagging)
CREATE TABLE IF NOT EXISTS public.item_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE,
    keyword_description TEXT,
    keyword_category TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Level 2 types (competency type categories)
CREATE TABLE IF NOT EXISTS public.level_2_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_name TEXT NOT NULL,
    type_description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Level 3 types (pillar type categories)
CREATE TABLE IF NOT EXISTS public.level_3_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_name TEXT NOT NULL,
    type_description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ASSESSMENTS
-- =====================================================

-- Assessments (main assessment definitions)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_name TEXT NOT NULL,
    assessment_description TEXT,
    assessment_admin_note TEXT,
    assessment_cover_addl TEXT,
    assessment_source_text TEXT,
    
    -- Pricing
    assessment_individual_price DECIMAL(10, 2),
    assessment_360_price DECIMAL(10, 2),
    assessment_upgrade_price DECIMAL(10, 2),
    assessment_stripe_id TEXT,
    
    -- Settings
    assessment_status content_status DEFAULT 'draft',
    assessment_type assessment_type DEFAULT 'self',
    assessment_time_estimate TEXT,
    assessment_can_retake BOOLEAN DEFAULT FALSE,
    assessment_retake_after_months INTEGER,
    assessment_upgradable_to_360 BOOLEAN DEFAULT FALSE,
    assessment_skip_cover_page BOOLEAN DEFAULT FALSE,
    
    -- Display options
    assessment_show_benchmarks BOOLEAN DEFAULT FALSE,
    assessment_show_3rd_person_on_reports BOOLEAN DEFAULT FALSE,
    randomize_pages BOOLEAN DEFAULT FALSE,
    randomize_sections BOOLEAN DEFAULT FALSE,
    randomize_items BOOLEAN DEFAULT FALSE,
    
    -- Naming conventions (can override model defaults)
    assessment_alt_pillar_name TEXT,
    assessment_alt_comp_name TEXT,
    assessment_alt_item_name TEXT,
    
    -- Linked model
    model_id UUID REFERENCES public.models(id),
    
    -- Purpose/categorization
    assessment_purpose_types TEXT[],
    
    created_by UUID REFERENCES public.profiles(id),
    generated_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment pages
CREATE TABLE IF NOT EXISTS public.assessment_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    page_title TEXT,
    page_description TEXT,
    page_instructions TEXT,
    sort_order INTEGER DEFAULT 0,
    
    -- Linked to pillar (optional)
    pillar_id UUID REFERENCES public.pillars(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment sections
CREATE TABLE IF NOT EXISTS public.assessment_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_page_id UUID NOT NULL REFERENCES public.assessment_pages(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    
    section_title TEXT,
    section_description TEXT,
    section_instructions TEXT,
    section_type TEXT,
    sort_order INTEGER DEFAULT 0,
    
    -- Linked to competency (optional)
    competency_id UUID REFERENCES public.competencies(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_section_id UUID REFERENCES public.assessment_sections(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    
    question_text TEXT NOT NULL,
    question_description TEXT,
    question_help_text TEXT,
    question_type question_type DEFAULT 'likert',
    is_required BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    -- Linked to indicator (optional)
    indicator_id UUID REFERENCES public.indicators(id),
    
    -- For profile field questions
    profile_field_key TEXT,
    
    -- Scoring
    reverse_scored BOOLEAN DEFAULT FALSE,
    scoring_scale_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question options (for multiple choice, likert scales, etc.)
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    
    option_text TEXT NOT NULL,
    option_value INTEGER,
    option_description TEXT,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment benefits (what users get from the assessment)
CREATE TABLE IF NOT EXISTS public.assessment_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    
    benefit_title TEXT NOT NULL,
    benefit_description TEXT,
    benefit_type TEXT,
    benefit_icon TEXT,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment collections (groups of assessments)
CREATE TABLE IF NOT EXISTS public.assessment_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_name TEXT NOT NULL,
    collection_description TEXT,
    collection_image TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: assessments in collections
CREATE TABLE IF NOT EXISTS public.assessment_collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES public.assessment_collections(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    
    UNIQUE(collection_id, assessment_id)
);

-- Assessment visibility overrides
CREATE TABLE IF NOT EXISTS public.assessment_visibility_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    
    visibility_target TEXT, -- 'organization', 'coach_company', 'user'
    target_id UUID,
    is_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ASSESSMENT RECORDS (User completions)
-- =====================================================

-- Assessment records (instances of users taking assessments)
CREATE TABLE IF NOT EXISTS public.assessment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    
    record_status record_status DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- For 360 assessments
    is_360 BOOLEAN DEFAULT FALSE,
    target_user_id UUID REFERENCES public.profiles(id), -- Who is being assessed
    rater_type feedback_type,
    
    -- Progress tracking
    current_page INTEGER DEFAULT 0,
    percent_complete DECIMAL(5, 2) DEFAULT 0,
    
    -- Results
    overall_score DECIMAL(5, 2),
    scores_json JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question responses
CREATE TABLE IF NOT EXISTS public.question_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_record_id UUID NOT NULL REFERENCES public.assessment_records(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    
    response_value INTEGER, -- For likert/numeric
    response_text TEXT, -- For open text
    response_options UUID[], -- For multiple choice (array of selected option IDs)
    
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(assessment_record_id, question_id)
);

-- Answers (deprecated - keeping for compatibility, use question_responses)
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_response_id UUID REFERENCES public.question_responses(id) ON DELETE CASCADE,
    answer_value TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SCORING
-- =====================================================

-- Scoring scales
CREATE TABLE IF NOT EXISTS public.scoring_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scale_name TEXT NOT NULL,
    scale_description TEXT,
    min_value INTEGER DEFAULT 1,
    max_value INTEGER DEFAULT 5,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scale response options (labels for each point on scale)
CREATE TABLE IF NOT EXISTS public.scale_response_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scoring_scale_id UUID NOT NULL REFERENCES public.scoring_scales(id) ON DELETE CASCADE,
    value INTEGER NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    
    UNIQUE(scoring_scale_id, value)
);

-- Scoring rules
CREATE TABLE IF NOT EXISTS public.scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
    
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    scoring_algorithm scoring_algorithm DEFAULT 'average',
    custom_formula TEXT, -- For custom algorithms
    
    -- Apply to level
    applies_to_level TEXT, -- 'item', 'competency', 'pillar', 'overall'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scoring records (calculated scores)
CREATE TABLE IF NOT EXISTS public.scoring_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_record_id UUID NOT NULL REFERENCES public.assessment_records(id) ON DELETE CASCADE,
    
    -- What this score is for
    entity_type TEXT NOT NULL, -- 'indicator', 'competency', 'pillar', 'overall'
    entity_id UUID,
    
    raw_score DECIMAL(10, 4),
    normalized_score DECIMAL(5, 2), -- 0-100 scale
    percentile_score DECIMAL(5, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benchmark scores
CREATE TABLE IF NOT EXISTS public.benchmark_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What this benchmark is for
    entity_type TEXT NOT NULL, -- 'indicator', 'competency', 'pillar', 'assessment'
    entity_id UUID NOT NULL,
    
    -- Benchmark category
    benchmark_name TEXT NOT NULL,
    benchmark_description TEXT,
    
    -- Values
    mean_score DECIMAL(10, 4),
    median_score DECIMAL(10, 4),
    std_deviation DECIMAL(10, 4),
    sample_size INTEGER,
    
    -- Percentile breakpoints
    percentile_25 DECIMAL(10, 4),
    percentile_50 DECIMAL(10, 4),
    percentile_75 DECIMAL(10, 4),
    percentile_90 DECIMAL(10, 4),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTIONS & ENTITLEMENTS
-- =====================================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_name TEXT NOT NULL,
    plan_description TEXT,
    
    -- Pricing
    monthly_price DECIMAL(10, 2),
    annual_price DECIMAL(10, 2),
    stripe_product_id TEXT,
    stripe_monthly_price_id TEXT,
    stripe_annual_price_id TEXT,
    
    -- Features
    max_users INTEGER,
    max_assessments_per_month INTEGER,
    features JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_plan_id UUID REFERENCES public.subscription_plans(id),
    
    subscription_status subscription_status DEFAULT 'trial',
    
    -- Stripe info
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    -- Dates
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    trial_ends TIMESTAMPTZ,
    
    is_monthly BOOLEAN DEFAULT TRUE,
    
    -- For sponsored subscriptions
    sponsored_by_id UUID REFERENCES public.profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entitlements (individual access grants)
CREATE TABLE IF NOT EXISTS public.entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    entitlement_type TEXT NOT NULL, -- 'assessment', 'report', 'feature'
    entitlement_target_id UUID, -- ID of assessment, etc.
    
    entitlement_status entitlement_status DEFAULT 'active',
    
    -- Source of entitlement
    granted_by_subscription_id UUID REFERENCES public.subscriptions(id),
    granted_by_user_id UUID REFERENCES public.profiles(id),
    granted_by_sponsorship_id UUID,
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsorships (organizations/coaches sponsoring assessments)
CREATE TABLE IF NOT EXISTS public.sponsorships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Sponsor
    sponsor_user_id UUID REFERENCES public.profiles(id),
    sponsor_organization_id UUID REFERENCES public.organizations(id),
    sponsor_coach_company_id UUID REFERENCES public.coach_companies(id),
    
    -- What's being sponsored
    assessment_id UUID REFERENCES public.assessments(id),
    
    -- Limits
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsorship policies
CREATE TABLE IF NOT EXISTS public.sponsorship_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sponsorship_id UUID REFERENCES public.sponsorships(id) ON DELETE CASCADE,
    
    policy_type TEXT, -- 'domain', 'invite_only', 'code'
    policy_value TEXT, -- domain pattern, invite code, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discounts
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discount_code TEXT UNIQUE,
    discount_name TEXT NOT NULL,
    discount_description TEXT,
    
    discount_type TEXT, -- 'percentage', 'fixed'
    discount_value DECIMAL(10, 2),
    
    -- Applicability
    applies_to_assessment_id UUID REFERENCES public.assessments(id),
    applies_to_plan_id UUID REFERENCES public.subscription_plans(id),
    
    -- Limits
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    
    -- What was purchased
    assessment_id UUID REFERENCES public.assessments(id),
    subscription_id UUID REFERENCES public.subscriptions(id),
    
    -- Payment info
    amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    
    -- Discount applied
    discount_id UUID REFERENCES public.discounts(id),
    discount_amount DECIMAL(10, 2),
    
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INVITATIONS & FEEDBACK
-- =====================================================

-- Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Inviter
    invited_by_id UUID REFERENCES public.profiles(id),
    
    -- Invitee
    invitee_email TEXT NOT NULL,
    invitee_name TEXT,
    
    invite_status invite_status DEFAULT 'pending',
    invite_code TEXT UNIQUE,
    
    -- What they're invited to
    invitation_type TEXT, -- 'assessment', 'organization', 'coach_company', '360_rater'
    invitation_target_id UUID,
    
    -- For 360 rater invites
    rater_type feedback_type,
    assessment_record_id UUID REFERENCES public.assessment_records(id),
    
    -- Validity
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback (for 360 or general feedback)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- From/To
    from_user_id UUID REFERENCES public.profiles(id),
    to_user_id UUID REFERENCES public.profiles(id),
    
    feedback_type feedback_type,
    
    -- Related to
    assessment_record_id UUID REFERENCES public.assessment_records(id),
    
    feedback_text TEXT,
    feedback_rating INTEGER,
    
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REPORTS & NARRATIVES
-- =====================================================

-- Report templates
CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL,
    template_description TEXT,
    
    -- Template content (could be HTML, markdown, or structured JSON)
    template_content TEXT,
    template_type TEXT, -- 'pdf', 'html', 'dashboard'
    
    -- Linked to assessment or model
    assessment_id UUID REFERENCES public.assessments(id),
    model_id UUID REFERENCES public.models(id),
    
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instruction templates (reusable instruction blocks)
CREATE TABLE IF NOT EXISTS public.instruction_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL,
    template_content TEXT,
    template_type TEXT, -- 'cover_page', 'section_intro', 'results_intro'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Narratives (dynamic text based on scores)
CREATE TABLE IF NOT EXISTS public.narratives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What this narrative is for
    entity_type TEXT, -- 'indicator', 'competency', 'pillar', 'overall'
    entity_id UUID,
    
    -- Score range this applies to
    min_score DECIMAL(5, 2),
    max_score DECIMAL(5, 2),
    
    narrative_level TEXT, -- 'low', 'medium', 'high'
    narrative_text TEXT NOT NULL,
    
    -- For personalization
    first_person_text TEXT,
    third_person_text TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cover page templates
CREATE TABLE IF NOT EXISTS public.coverpage_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL,
    template_html TEXT,
    template_css TEXT,
    
    assessment_id UUID REFERENCES public.assessments(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FEED/MESSAGING (simplified for MVP)
-- =====================================================

-- Conversations (threads)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Participants (for DM) or linked entity (for entity-based threads)
    participant_ids UUID[],
    
    -- Or linked to entity
    entity_type TEXT,
    entity_id UUID,
    
    conversation_title TEXT,
    conversation_status TEXT DEFAULT 'active',
    
    last_message_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    
    message_content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'file', 'system'
    
    -- File attachment
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    reaction_emoji TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id, reaction_emoji)
);

-- =====================================================
-- APP CONFIG & MISC
-- =====================================================

-- App configuration
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB,
    config_description TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Our team profiles (for public team page)
CREATE TABLE IF NOT EXISTS public.our_team_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    title TEXT,
    bio TEXT,
    photo_url TEXT,
    linkedin_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch tracker (for bulk operations)
CREATE TABLE IF NOT EXISTS public.batch_trackers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_type TEXT, -- 'import', 'export', 'email', 'scoring'
    batch_status TEXT DEFAULT 'pending',
    
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_log JSONB,
    
    created_by UUID REFERENCES public.profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files (for file uploads)
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID REFERENCES public.profiles(id),
    
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    
    -- Linked to entity
    entity_type TEXT,
    entity_id UUID,
    
    is_public BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SORTABLE ITEMS (for drag-drop ordering)
-- =====================================================

-- Sortable folders
CREATE TABLE IF NOT EXISTS public.sortable_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_name TEXT NOT NULL,
    parent_folder_id UUID REFERENCES public.sortable_folders(id),
    
    entity_type TEXT, -- What type of items this folder contains
    owner_id UUID REFERENCES public.profiles(id),
    
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(primary_role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(org_name);

-- Model/Assessment structure indexes
CREATE INDEX IF NOT EXISTS idx_pillars_model ON public.pillars(model_id);
CREATE INDEX IF NOT EXISTS idx_competencies_pillar ON public.competencies(pillar_id);
CREATE INDEX IF NOT EXISTS idx_competencies_model ON public.competencies(model_id);
CREATE INDEX IF NOT EXISTS idx_indicators_competency ON public.indicators(competency_id);
CREATE INDEX IF NOT EXISTS idx_indicators_model ON public.indicators(model_id);

-- Assessment indexes
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(assessment_status);
CREATE INDEX IF NOT EXISTS idx_assessments_model ON public.assessments(model_id);
CREATE INDEX IF NOT EXISTS idx_assessment_pages_assessment ON public.assessment_pages(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sections_page ON public.assessment_sections(assessment_page_id);
CREATE INDEX IF NOT EXISTS idx_questions_section ON public.questions(assessment_section_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON public.questions(assessment_id);

-- Assessment record indexes
CREATE INDEX IF NOT EXISTS idx_assessment_records_user ON public.assessment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_records_assessment ON public.assessment_records(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_records_status ON public.assessment_records(record_status);
CREATE INDEX IF NOT EXISTS idx_question_responses_record ON public.question_responses(assessment_record_id);

-- Scoring indexes
CREATE INDEX IF NOT EXISTS idx_scoring_records_assessment_record ON public.scoring_records(assessment_record_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_scores_entity ON public.benchmark_scores(entity_type, entity_id);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON public.entitlements(entitlement_status);

-- Invitation indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(invite_status);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING GIN(participant_ids);

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

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get user's full name
CREATE OR REPLACE FUNCTION get_user_full_name(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    full_name TEXT;
BEGIN
    SELECT CONCAT(user_firstname, ' ', user_lastname)
    INTO full_name
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(NULLIF(TRIM(full_name), ''), 'Unknown User');
END;
$$ language 'plpgsql';

-- Function to calculate assessment completion percentage
CREATE OR REPLACE FUNCTION calculate_assessment_completion(record_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_questions INTEGER;
    answered_questions INTEGER;
BEGIN
    SELECT COUNT(q.id)
    INTO total_questions
    FROM public.questions q
    JOIN public.assessment_records ar ON ar.assessment_id = q.assessment_id
    WHERE ar.id = record_id;
    
    SELECT COUNT(qr.id)
    INTO answered_questions
    FROM public.question_responses qr
    WHERE qr.assessment_record_id = record_id;
    
    IF total_questions = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((answered_questions::DECIMAL / total_questions::DECIMAL) * 100, 2);
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at triggers for all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON public.models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pillars_updated_at BEFORE UPDATE ON public.pillars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competencies_updated_at BEFORE UPDATE ON public.competencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON public.indicators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_pages_updated_at BEFORE UPDATE ON public.assessment_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_sections_updated_at BEFORE UPDATE ON public.assessment_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default app config
INSERT INTO public.app_config (config_key, config_value, config_description)
VALUES 
    ('site_name', '"IdealToolkit"', 'Name of the application'),
    ('site_tagline', '"Leadership Assessment Platform"', 'Site tagline'),
    ('default_scoring_scale', '{"min": 1, "max": 5}', 'Default scoring scale'),
    ('features_enabled', '{"360": true, "team": true, "messaging": true}', 'Feature flags')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default scoring scale
INSERT INTO public.scoring_scales (id, scale_name, scale_description, min_value, max_value)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '5-Point Likert', 'Standard 5-point agreement scale', 1, 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.scale_response_options (scoring_scale_id, value, label, description)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 1, 'Strongly Disagree', 'Completely disagree with the statement'),
    ('00000000-0000-0000-0000-000000000001', 2, 'Disagree', 'Somewhat disagree with the statement'),
    ('00000000-0000-0000-0000-000000000001', 3, 'Neutral', 'Neither agree nor disagree'),
    ('00000000-0000-0000-0000-000000000001', 4, 'Agree', 'Somewhat agree with the statement'),
    ('00000000-0000-0000-0000-000000000001', 5, 'Strongly Agree', 'Completely agree with the statement')
ON CONFLICT DO NOTHING;

-- Insert default subscription plan
INSERT INTO public.subscription_plans (id, plan_name, plan_description, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Free', 'Basic free access', TRUE)
ON CONFLICT DO NOTHING;
