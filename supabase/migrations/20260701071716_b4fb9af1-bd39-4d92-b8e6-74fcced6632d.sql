
CREATE TABLE IF NOT EXISTS public.price_cache (
  symbol text PRIMARY KEY,
  data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_cache TO authenticated;
GRANT ALL ON public.price_cache TO service_role;

ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read cache" ON public.price_cache;
CREATE POLICY "Authenticated can read cache" ON public.price_cache
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can write cache" ON public.price_cache;
CREATE POLICY "Authenticated can write cache" ON public.price_cache
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update cache" ON public.price_cache;
CREATE POLICY "Authenticated can update cache" ON public.price_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete cache" ON public.price_cache;
CREATE POLICY "Authenticated can delete cache" ON public.price_cache
  FOR DELETE TO authenticated USING (true);
