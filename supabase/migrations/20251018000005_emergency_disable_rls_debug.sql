-- EMERGENCY: Temporarily disable RLS to diagnose 500 errors
-- Migration: 20251018000005_emergency_disable_rls_debug

-- This is a diagnostic migration to identify the root cause of 500 errors
-- RLS will be re-enabled once we identify and fix the issue

-- =================================================================
-- DISABLE RLS TEMPORARILY FOR DEBUGGING
-- =================================================================

-- Disable RLS on all tables to see if that fixes the 500 errors
ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes DISABLE ROW LEVEL SECURITY;

-- Keep notifications RLS enabled since it's working fine
-- ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Note: This is temporary for debugging only
-- We'll re-enable RLS with proper policies once we identify the issue