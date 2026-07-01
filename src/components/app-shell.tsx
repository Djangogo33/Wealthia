import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, ArrowLeftRight, Wallet, TrendingUp, Sparkles, Settings, Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/strings";
import logoAsset from "@/assets/wealthia-logo.png.asset.json";
import { useDemo } from "@/hooks/use-demo";
import { useAuth } from "@/hooks/use-auth";
import { NotificationsBell } from "@/components/notifications-bell";
import type { ReactNode } from "react";

const items = [
  { to: "/", icon: Home, key: "home" },
  { to: "/transactions", icon: ArrowLeftRight, key: "transactions" },
  { to: "/comptes", icon: Wallet, key: "accounts" },
  { to: "/bourse", icon: TrendingUp, key: "stocks" },
  { to: "/conseiller", icon: Sparkles, key: "advisor" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLanguage } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isDemo, disableDemo } = useDemo();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  function exitToSignup() {
    disableDemo();
    navigate({ to: "/signup" });
  }

  const toggleLang = () => setLanguage(lang === "fr" ? "en" : "fr");
  const langLabel = lang === "fr" ? "🇬🇧 EN" : "🇫🇷 FR";


  return (
    <div className="min-h-screen bg-background text-foreground">
      {isDemo && (
        <div
          className="sticky top-0 z-30 flex h-10 w-full items-center justify-between gap-3 px-4 text-xs font-medium lg:pl-[256px]"
          style={{ background: "#C8B99A", color: "#0D0D0D" }}
        >
          <span className="truncate">✦ {t("demo.banner")}</span>
          <button onClick={exitToSignup} className="shrink-0 underline underline-offset-2">
            {t("demo.cta")}
          </button>
        </div>
      )}
      {/* Mobile top-right controls */}
      <div
        className="fixed right-3 top-3 z-30 flex items-center gap-2 lg:hidden"
        style={isDemo ? { top: "2.75rem" } : undefined}
      >
        <NotificationsBell />
        <Link
          to="/settings"
          aria-label="Settings"
          className="rounded-full border border-[var(--border)] bg-[var(--card)]/80 p-1.5 text-[var(--muted-foreground)] backdrop-blur"
        >
          <Settings className="h-4 w-4" />
        </Link>
        <button
          onClick={toggleLang}
          aria-label="Change language"
          className="rounded-full border border-[var(--border)] bg-[var(--card)]/80 px-2.5 py-1 text-[10px] text-[var(--muted-foreground)] backdrop-blur"
        >
          {langLabel}
        </button>
      </div>
      {/* Desktop sidebar */}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[240px] flex-col border-r border-[var(--border)] bg-[var(--card)] px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src={logoAsset.url} alt="Wealthia" className="h-9 w-9 rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold">{t("app.name")}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t("app.tagline")}</div>
          </div>
          <NotificationsBell />
          <button
            onClick={toggleLang}
            aria-label="Change language"
            className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {langLabel}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map(({ to, icon: Icon, key }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--muted)] text-[var(--gold)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t(`nav.${key}`)}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-[var(--border)] pt-3">
          {isAdmin && !isDemo && (
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--gold)] hover:bg-[var(--muted)]"
            >
              <Shield className="h-5 w-5" />
              <span>{t("admin.title")}</span>
            </Link>
          )}
          <Link
            to="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              path === "/settings"
                ? "bg-[var(--muted)] text-[var(--gold)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>{t("settings.title")}</span>
          </Link>
          <button
            onClick={async () => {
              if (isDemo) disableDemo();
              else await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#D4745A] hover:bg-[var(--muted)]"
          >
            <LogOut className="h-5 w-5" />
            <span>{t("settings.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="min-h-screen pb-24 lg:ml-[240px] lg:pb-8">{children}</main>

      {/* Mobile/Tablet bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {items.map(({ to, icon: Icon, key }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px]"
              >
                <Icon className={`h-5 w-5 ${active ? "text-[var(--gold)]" : "text-[var(--muted-foreground)]"}`} />
                <span className={active ? "text-[var(--gold)]" : "text-[var(--muted-foreground)]"}>
                  {t(`nav.${key}`)}
                </span>
                <span className={`h-1 w-1 rounded-full ${active ? "bg-[var(--gold)]" : "bg-transparent"}`} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
