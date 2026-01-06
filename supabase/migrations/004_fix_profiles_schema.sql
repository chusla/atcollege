-- Fix profiles table schema for registration flow
-- This adds missing columns that are needed by the Onboarding form

-- Add registration_complete column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'registration_complete') THEN
        ALTER TABLE profiles ADD COLUMN registration_complete BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add selected_campus_id column if not exists (from 001_initial_schema.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'selected_campus_id') THEN
        ALTER TABLE profiles ADD COLUMN selected_campus_id UUID;
    END IF;
END $$;

-- Add selected_campus_name column if not exists (from 001_initial_schema.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'selected_campus_name') THEN
        ALTER TABLE profiles ADD COLUMN selected_campus_name TEXT;
    END IF;
END $$;

-- Add full_name column if not exists (from 001_initial_schema.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- Update gender constraint to allow both cases (Male/Female/Other and male/female/other)
-- First drop the existing constraint if it exists, then add a more permissive one
DO $$
BEGIN
    -- Drop existing constraint if it exists (name might vary)
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
    
    -- Add updated constraint allowing both formats
    ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check 
        CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other', 'male', 'female', 'other', 'prefer_not_to_say'));
EXCEPTION WHEN OTHERS THEN
    -- If constraint doesn't exist or other issue, just continue
    NULL;
END $$;

-- Create index on selected_campus_id if not exists
CREATE INDEX IF NOT EXISTS idx_profiles_selected_campus ON profiles(selected_campus_id);

