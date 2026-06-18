import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, ArrowLeftRight, Wallet, TrendingUp, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoAsset from "@/assets/wealthia-logo.png.asset.json";
import { useDemo } from "@/hooks/use-demo";
import type { ReactNode } from "react";

const items = [
  { to: "/", icon: Home, key: "home" },
  { to: "/transactions", icon: ArrowLeftRight, key: "transactions" },
  { to: "/comptes", icon: Wallet, key: "accounts" },
  { to: "/bourse", icon: TrendingUp, key: "stocks" },
  { to: "/conseiller", icon: Sparkles, key: "advisor" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isDemo, disableDemo } = useDemo();
  const navigate = useNavigate();

  function exitToSignup() {
    disableDemo();
    navigate({ to: "/signup" });
  }

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
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[240px] flex-col border-r border-[var(--border)] bg-[var(--card)] px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src={logoAsset.url} alt="Wealthia" className="h-9 w-9 rounded-full" />
          <div>
            <div className="text-base font-semibold">{t("app.name")}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t("app.tagline")}</div>
          </div>
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
