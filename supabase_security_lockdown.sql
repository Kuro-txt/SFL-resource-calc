-- ==============================================================================
-- 🔒 SUPABASE ROW LEVEL SECURITY (RLS) LOCKDOWN MIGRATION
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
--
-- What this does:
-- 1. Strictly restricts SELECT/INSERT/UPDATE to the authenticated user (auth.uid() = user_id).
-- 2. Revokes public/anon read access so unauthenticated scrapers cannot dump tables.
-- 3. Grants full bypass to 'service_role' so Render backend cron jobs & API proxies continue working seamlessly.
-- ==============================================================================

-- ── 1. PROFILES TABLE ────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke blanket public access
REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- Clean existing policies
DROP POLICY IF EXISTS "Allow all to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;

-- Strict user policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 2. PREHARVEST BASELINES TABLE ─────────────────────────────────────────────
ALTER TABLE IF EXISTS public.preharvest_baselines ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.preharvest_baselines FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.preharvest_baselines TO authenticated;
GRANT ALL ON TABLE public.preharvest_baselines TO service_role;

DROP POLICY IF EXISTS "Allow all to view baselines" ON public.preharvest_baselines;
DROP POLICY IF EXISTS "Users can view own baselines" ON public.preharvest_baselines;
DROP POLICY IF EXISTS "Users can insert own baselines" ON public.preharvest_baselines;
DROP POLICY IF EXISTS "Users can update own baselines" ON public.preharvest_baselines;
DROP POLICY IF EXISTS "Users can delete own baselines" ON public.preharvest_baselines;
DROP POLICY IF EXISTS "Service role full access baselines" ON public.preharvest_baselines;

CREATE POLICY "Users can view own baselines"
  ON public.preharvest_baselines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own baselines"
  ON public.preharvest_baselines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baselines"
  ON public.preharvest_baselines FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own baselines"
  ON public.preharvest_baselines FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access baselines"
  ON public.preharvest_baselines FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 3. DAILY YIELDS TABLE ─────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.daily_yields ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.daily_yields FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_yields TO authenticated;
GRANT ALL ON TABLE public.daily_yields TO service_role;

DROP POLICY IF EXISTS "Allow all to view daily yields" ON public.daily_yields;
DROP POLICY IF EXISTS "Users can view own daily yields" ON public.daily_yields;
DROP POLICY IF EXISTS "Users can insert own daily yields" ON public.daily_yields;
DROP POLICY IF EXISTS "Users can update own daily yields" ON public.daily_yields;
DROP POLICY IF EXISTS "Users can delete own daily yields" ON public.daily_yields;
DROP POLICY IF EXISTS "Service role full access daily yields" ON public.daily_yields;

CREATE POLICY "Users can view own daily yields"
  ON public.daily_yields FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily yields"
  ON public.daily_yields FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily yields"
  ON public.daily_yields FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily yields"
  ON public.daily_yields FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access daily yields"
  ON public.daily_yields FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 4. WEEKLY YIELDS TABLE ────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.weekly_yields ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.weekly_yields FROM anon;
GRANT SELECT ON TABLE public.weekly_yields TO authenticated;
GRANT ALL ON TABLE public.weekly_yields TO service_role;

DROP POLICY IF EXISTS "Allow all to view weekly yields" ON public.weekly_yields;
DROP POLICY IF EXISTS "Users can view own weekly yields" ON public.weekly_yields;
DROP POLICY IF EXISTS "Service role full access weekly yields" ON public.weekly_yields;

CREATE POLICY "Users can view own weekly yields"
  ON public.weekly_yields FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access weekly yields"
  ON public.weekly_yields FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 5. MONTHLY YIELDS TABLE ───────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.monthly_yields ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.monthly_yields FROM anon;
GRANT SELECT ON TABLE public.monthly_yields TO authenticated;
GRANT ALL ON TABLE public.monthly_yields TO service_role;

DROP POLICY IF EXISTS "Allow all to view monthly yields" ON public.monthly_yields;
DROP POLICY IF EXISTS "Allow all to upsert monthly yields" ON public.monthly_yields;
DROP POLICY IF EXISTS "Users can view own monthly yields" ON public.monthly_yields;
DROP POLICY IF EXISTS "Service role full access monthly yields" ON public.monthly_yields;

CREATE POLICY "Users can view own monthly yields"
  ON public.monthly_yields FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access monthly yields"
  ON public.monthly_yields FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Done! Verification query:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
