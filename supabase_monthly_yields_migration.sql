-- Migration: Add monthly_yields table & upgrade weekly_yields for 60-day retention tiering

-- 1. Create monthly_yields table
CREATE TABLE IF NOT EXISTS public.monthly_yields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id VARCHAR(32),
  month_key VARCHAR(7) NOT NULL,        -- 'YYYY-MM', e.g. '2026-08'
  month_start DATE NOT NULL,            -- 'YYYY-MM-01'
  month_end DATE NOT NULL,              -- 'YYYY-MM-31'
  total_items NUMERIC DEFAULT 0,
  total_flowers NUMERIC DEFAULT 0,
  total_spent_items NUMERIC DEFAULT 0,
  total_spent_flowers NUMERIC DEFAULT 0,
  net_flowers NUMERIC DEFAULT 0,
  coins_earned NUMERIC DEFAULT 0,
  coins_spent NUMERIC DEFAULT 0,
  gems_spent NUMERIC DEFAULT 0,
  items_summary JSONB DEFAULT '{}'::jsonb,  -- {"Sunflower": [qty, flowers], ...}
  spent_summary JSONB DEFAULT '{}'::jsonb,  -- {"Sunflower Seed": [qty, flowers], "Gems": [qty, flowers], ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_key)
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_monthly_yields_user_month 
  ON public.monthly_yields (user_id, month_key);

-- Grant table permissions to anon, authenticated, and service_role
GRANT ALL ON TABLE public.monthly_yields TO anon, authenticated, service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE public.monthly_yields ENABLE ROW LEVEL SECURITY;

-- Allow all users/client to view monthly yields
DROP POLICY IF EXISTS "Users can view own monthly yields" ON public.monthly_yields;
DROP POLICY IF EXISTS "Allow all to view monthly yields" ON public.monthly_yields;
CREATE POLICY "Allow all to view monthly yields"
  ON public.monthly_yields FOR SELECT
  USING (true);

-- Allow backend cron / service role to upsert monthly yields
DROP POLICY IF EXISTS "Service role can manage monthly yields" ON public.monthly_yields;
DROP POLICY IF EXISTS "Allow all to upsert monthly yields" ON public.monthly_yields;
CREATE POLICY "Allow all to upsert monthly yields"
  ON public.monthly_yields FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Upgrade weekly_yields table with spent columns if they don't exist
ALTER TABLE public.weekly_yields ADD COLUMN IF NOT EXISTS spent_summary JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.weekly_yields ADD COLUMN IF NOT EXISTS total_spent_items NUMERIC DEFAULT 0;
ALTER TABLE public.weekly_yields ADD COLUMN IF NOT EXISTS total_spent_flowers NUMERIC DEFAULT 0;
ALTER TABLE public.weekly_yields ADD COLUMN IF NOT EXISTS net_flowers NUMERIC DEFAULT 0;
ALTER TABLE public.weekly_yields ADD COLUMN IF NOT EXISTS coins_earned NUMERIC DEFAULT 0;
ALTER TABLE public.weekly_yields ADD COLUMN IF NOT EXISTS coins_spent NUMERIC DEFAULT 0;
ALTER TABLE public.weekly_yields ADD COLUMN IF NOT EXISTS gems_spent NUMERIC DEFAULT 0;
