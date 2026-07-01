
DROP POLICY IF EXISTS "Authenticated can write cache" ON public.price_cache;
CREATE POLICY "Authenticated can write cache" ON public.price_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update cache" ON public.price_cache;
CREATE POLICY "Authenticated can update cache" ON public.price_cache
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete cache" ON public.price_cache;
CREATE POLICY "Authenticated can delete cache" ON public.price_cache
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
