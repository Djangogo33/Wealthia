
-- 1) Prevent client-side privilege escalation on profiles.plan / plan_expires_at / stripe_customer_id
CREATE OR REPLACE FUNCTION public.prevent_profile_billing_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role') <> 'service_role' AND NOT (
    SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user
  ) THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'plan column can only be updated by the system';
    END IF;
    IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
      RAISE EXCEPTION 'plan_expires_at can only be updated by the system';
    END IF;
    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
      RAISE EXCEPTION 'stripe_customer_id can only be updated by the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_billing_changes ON public.profiles;
CREATE TRIGGER trg_prevent_profile_billing_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_billing_changes();

REVOKE EXECUTE ON FUNCTION public.prevent_profile_billing_changes() FROM PUBLIC, anon, authenticated;

-- 2) Atomic promo-code redemption (race-safe)
CREATE OR REPLACE FUNCTION public.apply_promo_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  c record;
  new_expiry timestamptz;
  base_ts timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- Lock the code row, atomically enforce max_uses and expiry
  UPDATE public.promo_codes
    SET uses_count = uses_count + 1
    WHERE code = upper(trim(_code))
      AND active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR uses_count < max_uses)
    RETURNING * INTO c;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_exhausted');
  END IF;

  -- Prevent same user from redeeming the same code twice
  IF EXISTS (SELECT 1 FROM public.promo_code_uses WHERE code_id = c.id AND user_id = uid) THEN
    -- rollback the increment
    UPDATE public.promo_codes SET uses_count = uses_count - 1 WHERE id = c.id;
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  INSERT INTO public.promo_code_uses (code_id, user_id) VALUES (c.id, uid);

  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO base_ts
    FROM public.profiles WHERE id = uid;

  new_expiry := base_ts + make_interval(days => c.duration_days);

  UPDATE public.profiles
    SET plan = c.plan,
        plan_expires_at = new_expiry
    WHERE id = uid;

  RETURN jsonb_build_object('ok', true, 'plan', c.plan, 'expires_at', new_expiry);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_promo_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_promo_code(text) TO authenticated;

-- 3) Reschedule cron jobs with a private CRON_SECRET header
SELECT cron.unschedule('process-subscriptions-daily');
SELECT cron.unschedule('send-subscription-reminders-daily');

SELECT cron.schedule(
  'process-subscriptions-daily',
  '0 7 * * *',
  $CRON$
  SELECT net.http_post(
    url := 'https://project--b37034b8-2107-41d8-bb12-670214a48ea9.lovable.app/api/public/hooks/process-subscriptions',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "yB8VuNjQj0PV2zkOsE1NAYUz_rGOTpm8kAtMhGClbdkYY5sVohQvt3e9TrdMcXv0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $CRON$
);

SELECT cron.schedule(
  'send-subscription-reminders-daily',
  '5 7 * * *',
  $CRON$
  SELECT net.http_post(
    url := 'https://project--b37034b8-2107-41d8-bb12-670214a48ea9.lovable.app/api/public/hooks/send-subscription-reminders',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "yB8VuNjQj0PV2zkOsE1NAYUz_rGOTpm8kAtMhGClbdkYY5sVohQvt3e9TrdMcXv0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $CRON$
);

-- 4) Restrict SECURITY DEFINER helper functions from anon / authenticated where inappropriate.
-- Keep has_role executable by authenticated (used inside RLS policies).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_first_transaction() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_referral_rewards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
