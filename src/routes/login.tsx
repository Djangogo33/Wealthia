import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/strings";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoFullAsset from "@/assets/wealthia-logo-full-light.png.asset.json";
import { LegalFooter } from "@/components/legal-footer";


export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Connexion — Wealthia" },
      { name: "description", content: "Connectez-vous à Wealthia pour suivre vos comptes, budgets et investissements en toute sécurité." },
      { property: "og:title", content: "Connexion — Wealthia" },
      { property: "og:description", content: "Connectez-vous à Wealthia pour suivre vos comptes, budgets et investissements en toute sécurité." },
      { property: "og:url", content: "https://wealthia.lovable.app/login" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://wealthia.lovable.app/login" }],
  }),
});

function LoginPage() {
  const { t, lang, setLanguage } = useTranslation();

  const { session } = useAuth();
  const { enableDemo } = useDemo();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function startDemo() {
    enableDemo();
    navigate({ to: "/" });
  }


  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/" });
  }

  async function magicLink() {
    if (!email) return toast.error("Email requis");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.magicSent"));
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error(String(result.error));
    if (!result.redirected) navigate({ to: "/" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <button
        onClick={() => setLanguage(lang === "fr" ? "en" : "fr")}
        className="absolute right-4 top-4 rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] text-[var(--muted-foreground)]"
      >
        {lang === "fr" ? "🇬🇧 EN" : "🇫🇷 FR"}
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logoFullAsset.url} alt="Logo Wealthia" className="h-24 w-auto" />
          <h1 className="mt-4 text-2xl font-semibold">Wealthia — Gestion de Patrimoine</h1>
          <p className="mt-3 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">{t("app.tagline")}</p>
        </div>
        <div className="card-surface p-6">
          <Button onClick={google} variant="outline" className="w-full border-[var(--border)]">
            {t("auth.google")}
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <div className="h-px flex-1 bg-[var(--border)]" /> {t("auth.or")} <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <form className="space-y-3" onSubmit={signInPassword}>
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[var(--gold)] text-[var(--primary-foreground)] hover:opacity-90">
              {t("auth.login")}
            </Button>
          </form>
          <button onClick={magicLink} disabled={busy} className="mt-3 w-full text-center text-xs text-[var(--gold)] hover:underline">
            {t("auth.magicLink")}
          </button>
        </div>
        <button
          onClick={startDemo}
          className="mt-5 w-full rounded-xl border border-[var(--gold)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--gold)] transition hover:bg-[var(--gold)]/10"
        >
          {t("demo.button")}
        </button>
        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          {t("auth.noAccount")} <Link to="/signup" className="text-[var(--gold)]">{t("auth.signup")}</Link>
        </p>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--muted-foreground)]">
          {t("legal.loginConsent")}{" "}
          <Link to="/legal/cgu" className="underline hover:text-[var(--gold)]">{t("legal.cgu")}</Link>{" "}
          {t("legal.loginConsentAnd")}{" "}
          <Link to="/legal/confidentialite" className="underline hover:text-[var(--gold)]">{t("legal.privacy")}</Link>.
        </p>
        <LegalFooter />
      </div>
    </div>
  );
}

