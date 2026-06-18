import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoAsset from "@/assets/wealthia-logo.png.asset.json";

export const Route = createFileRoute("/signup")({ ssr: false, component: SignupPage });

function SignupPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) navigate({ to: "/" }); }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error(String(result.error));
    if (!result.redirected) navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logoAsset.url} alt="Wealthia" className="h-16 w-16 rounded-full" />
          <h1 className="mt-4 text-2xl font-semibold">{t("auth.signup")}</h1>
        </div>
        <div className="card-surface p-6">
          <Button onClick={google} variant="outline" className="w-full border-[var(--border)]">{t("auth.google")}</Button>
          <div className="my-4 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <div className="h-px flex-1 bg-[var(--border)]" /> {t("auth.or")} <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <form className="space-y-3" onSubmit={submit}>
            <div><Label htmlFor="name">{t("auth.name")}</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label htmlFor="email">{t("auth.email")}</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="password">{t("auth.password")}</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
            <Button type="submit" disabled={busy} className="w-full bg-[var(--gold)] text-[var(--primary-foreground)] hover:opacity-90">{t("auth.signup")}</Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          {t("auth.haveAccount")} <Link to="/login" className="text-[var(--gold)]">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
}
