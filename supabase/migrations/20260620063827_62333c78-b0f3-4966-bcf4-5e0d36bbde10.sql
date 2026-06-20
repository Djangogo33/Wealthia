
-- 1. Roles enum + table (separate from profiles for security)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Profiles: referral fields + plan expiry
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Allow admins to read/update any profile
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  plan text NOT NULL CHECK (plan IN ('free','pro','max')),
  duration_days integer NOT NULL,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read active promo codes" ON public.promo_codes;
CREATE POLICY "Authenticated can read active promo codes" ON public.promo_codes
  FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Promo code uses
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id, user_id)
);

GRANT SELECT, INSERT ON public.promo_code_uses TO authenticated;
GRANT ALL ON public.promo_code_uses TO service_role;

ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own uses" ON public.promo_code_uses;
CREATE POLICY "Users see own uses" ON public.promo_code_uses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own uses" ON public.promo_code_uses;
CREATE POLICY "Users insert own uses" ON public.promo_code_uses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all uses" ON public.promo_code_uses;
CREATE POLICY "Admins view all uses" ON public.promo_code_uses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own referrals" ON public.referrals;
CREATE POLICY "Users see own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Admins view all referrals" ON public.referrals;
CREATE POLICY "Admins view all referrals" ON public.referrals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Auto-generate referral_code on profile insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    new_code := upper(substring(md5(random()::text) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
  END LOOP;
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Backfill referral_code for existing profiles
DO $$
DECLARE
  r record;
  new_code text;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := upper(substring(md5(random()::text) FROM 1 FOR 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    END LOOP;
    UPDATE public.profiles SET referral_code = new_code WHERE id = r.id;
  END LOOP;
END $$;

-- 7. Referral reward function (called after first transaction)
CREATE OR REPLACE FUNCTION public.grant_referral_rewards(_referred_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.referrals WHERE referred_id = _referred_id AND reward_granted = false;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.profiles
    SET plan = 'pro',
        plan_expires_at = now() + interval '30 days'
    WHERE id = _referred_id;

  UPDATE public.profiles
    SET plan = 'pro',
        plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + interval '30 days'
    WHERE id = r.referrer_id;

  UPDATE public.referrals SET reward_granted = true WHERE id = r.id;
END;
$$;

-- 8. Trigger on first transaction to grant rewards
CREATE OR REPLACE FUNCTION public.handle_first_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.transactions WHERE user_id = NEW.user_id) = 1 THEN
    PERFORM public.grant_referral_rewards(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_referral_on_first_tx ON public.transactions;
CREATE TRIGGER grant_referral_on_first_tx
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_transaction();
