import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon, Copy, Share2, LogOut, Globe, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/strings";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function planBadgeStyle(plan: string) {
  if (plan === "max") return { background: "#D4745A", color: "#0D0D0D" };
  if (plan === "pro") return { background: "#C8B99A", color: "#0D0D0D" };
  return { background: "#2A2A2A", color: "#A3A3A3" };
}

function SettingsPage() {
  const { t, lang, setLanguage } = useTranslation();
  const { profile, signOut, reloadProfile } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const [promo, setPromo] = useState("");
  const [applying, setApplying] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteWord, setDeleteWord] = useState("");
  const [deleting, setDeleting] = useState(false);


  const referralCode = isDemo ? "DEMO1234" : profile?.referral_code ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = referralCode ? `${origin}/signup?ref=${referralCode}` : "";

  const { data: referralStats } = useQuery({
    queryKey: ["referral-stats", profile?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return { active: 2, rewards: 2 };
      if (!profile) return { active: 0, rewards: 0 };
      const { data } = await supabase
        .from("referrals")
        .select("reward_granted")
        .eq("referrer_id", profile.id);
      const rows = data ?? [];
      return {
        active: rows.length,
        rewards: rows.filter((r) => r.reward_granted).length,
      };
    },
    enabled: !!profile || isDemo,
  });

  async function applyPromo() {
    if (!promo.trim()) return;
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      return;
    }
    if (!profile) return;
    setApplying(true);
    try {
      const { data: code, error: e1 } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promo.trim().toUpperCase())
        .eq("active", true)
        .maybeSingle();
      if (e1 || !code) {
        toast.error(t("settings.promoError"));
        return;
      }
      if (code.expires_at && new Date(code.expires_at) < new Date()) {
        toast.error(t("settings.promoError"));
        return;
      }
      if (code.max_uses && code.uses_count >= code.max_uses) {
        toast.error(t("settings.promoError"));
        return;
      }
      const { error: useErr } = await supabase
        .from("promo_code_uses")
        .insert({ code_id: code.id, user_id: profile.id });
      if (useErr) {
        toast.error(t("settings.promoError"));
        return;
      }
      const newExpiry = new Date(
        Math.max(
          profile.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : Date.now(),
          Date.now(),
        ) + code.duration_days * 86400000,
      ).toISOString();
      await supabase
        .from("profiles")
        .update({ plan: code.plan as "free" | "pro" | "max", plan_expires_at: newExpiry })
        .eq("id", profile.id);
      await supabase
        .from("promo_codes")
        .update({ uses_count: code.uses_count + 1 })
        .eq("id", code.id);
      toast.success(t("settings.promoSuccess"));
      setPromo("");
      await reloadProfile();
    } finally {
      setApplying(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t("admin.copied"));
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Wealthia", url: referralLink });
      } catch {
        /* user cancelled */
      }
    } else {
      copy(referralLink);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  async function confirmDelete() {
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      return;
    }
    if (!profile) return;
    if (deleteWord.trim().toUpperCase() !== t("settings.deleteConfirmWord")) return;
    setDeleting(true);
    try {
      await supabase
        .from("profiles")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", profile.id);
      try {
        await fetch("/api/stripe/cancel-subscription", { method: "POST" });
      } catch {
        /* best effort */
      }
      await supabase.auth.signOut();
      toast.success(t("settings.deleteSuccess"));
      navigate({ to: "/login" });
    } finally {
      setDeleting(false);
      setDeleteStep(0);
      setDeleteWord("");
    }
  }


  const initials = (profile?.name ?? profile?.email ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-6">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--gold)]">{t("settings.title")}</h1>

      {/* Profile */}
      <section className="card-surface mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("settings.profile")}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gold)] text-lg font-semibold text-[var(--primary-foreground)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{profile?.name ?? "—"}</div>
            <div className="truncate text-sm text-[var(--muted-foreground)]">{profile?.email}</div>
          </div>
        </div>
      </section>

      {/* Plan */}
      <section className="card-surface mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("settings.plan")}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge style={planBadgeStyle(profile?.plan ?? "free")} className="px-3 py-1 text-xs uppercase">
            {profile?.plan ?? "free"}
          </Badge>
          <span className="text-xs text-[var(--muted-foreground)]">
            {profile?.plan_expires_at
              ? `${t("settings.planExpires")} ${new Date(profile.plan_expires_at).toLocaleDateString()}`
              : t("settings.planPermanent")}
          </span>
        </div>
      </section>

      {/* Referral */}
      <section className="card-surface mb-4 p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("settings.referral")}
        </h2>
        <p className="mb-4 text-sm text-[var(--foreground)]">{t("settings.referralTitle")}</p>
        <Label className="text-xs text-[var(--muted-foreground)]">{t("settings.referralLink")}</Label>
        <div className="mt-1 flex gap-2">
          <Input readOnly value={referralLink} className="flex-1 text-xs" />
          <Button variant="outline" size="icon" onClick={() => copy(referralLink)} aria-label="copy">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={share} aria-label="share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-[var(--muted)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{t("settings.referralActive")}</div>
            <div className="text-xl font-semibold text-[var(--gold)]">{referralStats?.active ?? 0}</div>
          </div>
          <div className="rounded-lg bg-[var(--muted)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{t("settings.referralRewards")}</div>
            <div className="text-xl font-semibold text-[var(--gold)]">
              {referralStats?.rewards ?? 0} {t("settings.referralMonths")}
            </div>
          </div>
        </div>
      </section>

      {/* Promo code */}
      <section className="card-surface mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("settings.promoCode")}
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder={t("settings.promoPlaceholder")}
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            className="flex-1"
          />
          <Button
            onClick={applyPromo}
            disabled={applying || !promo.trim()}
            className="bg-[var(--gold)] text-[var(--primary-foreground)]"
          >
            {t("settings.promoApply")}
          </Button>
        </div>
      </section>

      {/* Language */}
      <section className="card-surface mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("settings.language")}
        </h2>
        <div className="flex gap-2">
          <Button
            variant={lang === "fr" ? "default" : "outline"}
            onClick={() => setLanguage("fr")}
            className={lang === "fr" ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : ""}
          >
            <Globe className="mr-2 h-4 w-4" /> 🇫🇷 FR
          </Button>
          <Button
            variant={lang === "en" ? "default" : "outline"}
            onClick={() => setLanguage("en")}
            className={lang === "en" ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : ""}
          >
            <Globe className="mr-2 h-4 w-4" /> 🇬🇧 EN
          </Button>
        </div>
      </section>

      {/* Logout */}
      {!isDemo && (
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full border-[#D4745A] text-[#D4745A] hover:bg-[#D4745A]/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("settings.logout")}
        </Button>
      )}
    </div>
  );
}

// Keep icon import referenced when tree-shaking
void SettingsIcon;
