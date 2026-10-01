-- ==============================================================================
-- Migration: Drop api_key Column from public.profiles
-- ==============================================================================
-- Run this in your Supabase SQL Editor if an api_key column exists on public.profiles:

ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS api_key;
