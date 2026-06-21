
-- 1. savings_goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '🎯',
  target_amount numeric(18,6) NOT NULL,
  current_amount numeric(18,6) DEFAULT 0,
  target_date date,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO authenticated;
GRANT ALL ON public.savings_goals TO service_role;

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own savings goals"
  ON public.savings_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. assets additions
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'ETF',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_price numeric(18,6),
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz;

-- 3. update existing default category icons to lucide names
UPDATE public.categories SET icon = 'utensils'         WHERE is_default AND name = 'Alimentation';
UPDATE public.categories SET icon = 'car'              WHERE is_default AND name = 'Transport';
UPDATE public.categories SET icon = 'utensils-crossed' WHERE is_default AND name = 'Restaurants';
UPDATE public.categories SET icon = 'home'             WHERE is_default AND name = 'Logement';
UPDATE public.categories SET icon = 'heart-pulse'      WHERE is_default AND name = 'Santé';
UPDATE public.categories SET icon = 'gamepad-2'        WHERE is_default AND name = 'Loisirs';
UPDATE public.categories SET icon = 'shopping-bag'     WHERE is_default AND name = 'Shopping';
UPDATE public.categories SET icon = 'gift'             WHERE is_default AND name = 'Cadeaux';
UPDATE public.categories SET icon = 'trending-up'      WHERE is_default AND name = 'Revenus';
UPDATE public.categories SET icon = 'plus-circle'      WHERE is_default AND name = 'Autres revenus';
