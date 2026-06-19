
CREATE TYPE public.debt_type AS ENUM ('debt','loan');

CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  type public.debt_type NOT NULL,
  total_amount numeric(18,6) NOT NULL,
  remaining_amount numeric(18,6) NOT NULL,
  due_date date,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debts TO authenticated;
GRANT ALL ON public.debts TO service_role;

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own debts" ON public.debts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER debts_set_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.subscriptions_tracked ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
