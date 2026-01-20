-- ============================================
-- FIX RLS FOR GOOGLE-IMPORTED PLACES
-- Run this to allow authenticated users to update Google-imported places
-- ============================================

-- Drop the old restrictive policy for place updates
DROP POLICY IF EXISTS "Users can update own places or admins can update any" ON places;

-- Create new policy that allows:
-- 1. Users to update their own places (created_by = auth.uid())
-- 2. Admins to update any place
-- 3. Authenticated users to update Google-imported places (source = 'google_maps')
CREATE POLICY "Users can update own places, admins can update any, or Google imports" ON places
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
    (source = 'google_maps' AND auth.uid() IS NOT NULL)
  );

-- Also allow viewing pending places from Google imports
DROP POLICY IF EXISTS "Approved places are viewable by everyone" ON places;

CREATE POLICY "Approved and pending places are viewable by everyone" ON places
  FOR SELECT USING (
    status IN ('approved', 'pending') OR 
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add comment explaining the policies
COMMENT ON POLICY "Users can update own places, admins can update any, or Google imports" ON places IS
  'Allows place updates for: 1) place creators, 2) admins, 3) any authenticated user for Google-imported places';

COMMENT ON POLICY "Approved and pending places are viewable by everyone" ON places IS
  'Allows viewing approved and pending places (pending needed for Google imports before categorization)';
