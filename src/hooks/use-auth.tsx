import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro" | "max";
  locale: string;
  referral_code: string | null;
  plan_expires_at: string | null;
  referred_by: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id);
          loadRole(s.user.id);
          if (event === "SIGNED_IN") consumePendingReferral(s.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id);
        loadRole(data.session.user.id);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,name,avatar_url,plan,locale,referral_code,plan_expires_at,referred_by")
      .eq("id", uid)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }

  async function loadRole(uid: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  }

  async function consumePendingReferral(uid: string) {
    if (typeof window === "undefined") return;
    const code = window.localStorage.getItem("wealthia_pending_ref");
    if (!code) return;
    window.localStorage.removeItem("wealthia_pending_ref");
    const { data: ref } = await supabase
      .from("profiles")
      .select("id,referred_by")
      .eq("id", uid)
      .maybeSingle();
    if (!ref || ref.referred_by) return;
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer || referrer.id === uid) return;
    await supabase.from("profiles").update({ referred_by: referrer.id }).eq("id", uid);
    await supabase.from("referrals").insert({ referrer_id: referrer.id, referred_id: uid });
  }

  async function reloadProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, isAdmin, loading, signOut, reloadProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
