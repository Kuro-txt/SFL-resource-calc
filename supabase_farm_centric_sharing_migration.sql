-- ==============================================================================
-- 🚀 SUPABASE FARM-CENTRIC DATA ARCHITECTURE & SHARING MIGRATION
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
--
-- What this does:
-- 1. Adds 'farm_id' column to daily_yields (if not already present) and indexes it.
-- 2. Backfills all existing daily_yields rows with their farm_id from public.profiles.
-- 3. Updates Row Level Security (RLS) policies so all users linked to the same farm_id
--    can seamlessly view daily yields, weekly yields, monthly yields, and baselines.
-- 4. Allows newly registered users linking an existing farm_id to immediately view
--    all historical data saved for that farm.
-- ==============================================================================

-- ── 1. DAILY YIELDS TABLE UPGRADE ─────────────────────────────────────────────
ALTER TABLE IF EXISTS public.daily_yields 
  ADD COLUMN IF NOT EXISTS farm_id VARCHAR(32);

-- Index for fast farm-based queries
CREATE INDEX IF NOT EXISTS idx_daily_yields_farm_date 
  ON public.daily_yields (farm_id, yield_date DESC);

-- Backfill farm_id on existing daily_yields rows using public.profiles
UPDATE public.daily_yields y
SET farm_id = p.farm_id
FROM public.profiles p
WHERE y.user_id = p.id
  AND (y.farm_id IS NULL OR y.farm_id = '')
  AND p.farm_id IS NOT NULL;

-- ── 2. PREHARVEST BASELINES TABLE UPGRADE ─────────────────────────────────────
ALTER TABLE IF EXISTS public.preharvest_baselines 
  ADD COLUMN IF NOT EXISTS farm_id VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_preharvest_baselines_farm_date 
  ON public.preharvest_baselines (farm_id, snapshot_date DESC);

-- Backfill farm_id on existing preharvest_baselines if missing
UPDATE public.preharvest_baselines b
SET farm_id = p.farm_id
FROM public.profiles p
WHERE b.user_id = p.id
  AND (b.farm_id IS NULL OR b.farm_id = '')
  AND p.farm_id IS NOT NULL;

-- ── 3. WEEKLY YIELDS TABLE UPGRADE ────────────────────────────────────────────
ALTER TABLE IF EXISTS public.weekly_yields 
  ADD COLUMN IF NOT EXISTS farm_id VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_weekly_yields_farm_week 
  ON public.weekly_yields (farm_id, week_start DESC);

-- Backfill farm_id on existing weekly_yields if missing
UPDATE public.weekly_yields w
SET farm_id = p.farm_id
FROM public.profiles p
WHERE w.user_id = p.id
  AND (w.farm_id IS NULL OR w.farm_id = '')
  AND p.farm_id IS NOT NULL;

-- ── 4. MONTHLY YIELDS TABLE UPGRADE ───────────────────────────────────────────
ALTER TABLE IF EXISTS public.monthly_yields 
  ADD COLUMN IF NOT EXISTS farm_id VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_monthly_yields_farm_month 
  ON public.monthly_yields (farm_id, month_key DESC);

-- Backfill farm_id on existing monthly_yields if missing
UPDATE public.monthly_yields m
SET farm_id = p.farm_id
FROM public.profiles p
WHERE m.user_id = p.id
  AND (m.farm_id IS NULL OR m.farm_id = '')
  AND p.farm_id IS NOT NULL;

-- ── 5. ROW LEVEL SECURITY (RLS) POLICIES FOR SHARED ACCESS ────────────────────
-- Ensure authenticated users can view records if they are the creator OR if their
-- profile currently has that farm_id linked.

-- Daily Yields Policy
DROP POLICY IF EXISTS "Users can view own daily yields" ON public.daily_yields;
DROP POLICY IF EXISTS "Users can view shared daily yields" ON public.daily_yields;
CREATE POLICY "Users can view shared daily yields"
  ON public.daily_yields FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR (farm_id IS NOT NULL AND farm_id IN (
      SELECT farm_id FROM public.profiles WHERE id = auth.uid() AND farm_id IS NOT NULL
    ))
  );

-- Preharvest Baselines Policy
DROP POLICY IF EXISTS "Users can view own baselines" ON public.preharvest_baselines;
DROP POLICY IF EXISTS "Users can view shared baselines" ON public.preharvest_baselines;
CREATE POLICY "Users can view shared baselines"
  ON public.preharvest_baselines FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR (farm_id IS NOT NULL AND farm_id IN (
      SELECT farm_id FROM public.profiles WHERE id = auth.uid() AND farm_id IS NOT NULL
    ))
  );

-- Weekly Yields Policy
DROP POLICY IF EXISTS "Users can view own weekly yields" ON public.weekly_yields;
DROP POLICY IF EXISTS "Users can view shared weekly yields" ON public.weekly_yields;
DROP POLICY IF EXISTS "Allow all to view weekly yields" ON public.weekly_yields;
CREATE POLICY "Users can view shared weekly yields"
  ON public.weekly_yields FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR (farm_id IS NOT NULL AND farm_id IN (
      SELECT farm_id FROM public.profiles WHERE id = auth.uid() AND farm_id IS NOT NULL
    ))
  );

-- Monthly Yields Policy
DROP POLICY IF EXISTS "Users can view own monthly yields" ON public.monthly_yields;
DROP POLICY IF EXISTS "Users can view shared monthly yields" ON public.monthly_yields;
DROP POLICY IF EXISTS "Allow all to view monthly yields" ON public.monthly_yields;
CREATE POLICY "Users can view shared monthly yields"
  ON public.monthly_yields FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR (farm_id IS NOT NULL AND farm_id IN (
      SELECT farm_id FROM public.profiles WHERE id = auth.uid() AND farm_id IS NOT NULL
    ))
  );

-- Note: Backend cron uses 'service_role' key which bypasses RLS completely.
