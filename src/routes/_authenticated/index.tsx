import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { formatEUR, formatSigned } from "@/lib/format";
import { Plus, PieChart, Sparkles, TrendingUp, CreditCard, Wallet, BarChart3 } from "lucide-react";
import { useState } from "react";
import { PaywallModal } from "@/components/paywall-modal";
import { useFeatureGate } from "@/hooks/use-feature-gate";

export const Route = createFileRoute("/_authenticated/")({
  component: Accueil,
});

// Mock data — replaced with live queries in the next prompt
const MOCK = {
  balance: 543.02,
  income: 65.0,
  expenses: -69.23,
  accounts: [
    { name: "BoursoBank", type: "COURANT", balance: 400.09, icon: CreditCard },
    { name: "Cash", type: "LIQUIDE", balance: 22.93, icon: Wallet },
  ],
  categories: [
    { name: "Alimentation", amount: 41.79, percent: 60 },
    { name: "Restaurants", amount: 18.94, percent: 27 },
    { name: "Autre", amount: 8.5, percent: 13 },
  ],
};

function Accueil() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const ai = useFeatureGate("ai_advisor");
  const [reportsOpen, setReportsOpen] = useState(false);
  const reportsGate = useFeatureGate("export_pdf");

  const quick = [
    { key: "quickAdd", icon: Plus, primary: true, onClick: () => {} },
    { key: "quickReports", icon: PieChart, onClick: () => reportsGate.check() && setReportsOpen(false) },
    { key: "quickAI", icon: Sparkles, onClick: () => ai.check() },
    { key: "quickStocks", icon: TrendingUp, onClick: () => {} },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-semibold tracking-tight">{t("home.hello")}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t("home.overview")}</p>
          {profile?.name && (
            <p className="mt-0.5 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">{profile.name}</p>
          )}
        </div>
        <button className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
          <BarChart3 className="h-5 w-5" />
        </button>
      </header>

      {/* Balance hero */}
      <section
        className="card-surface relative mb-7 overflow-hidden p-6"
        style={{ backgroundImage: "var(--gradient-card)" }}
      >
        <div className="label-caps">{t("home.totalBalance")}</div>
        <div className="mt-3 text-5xl font-light text-[var(--gold)]">{formatEUR(MOCK.balance)}</div>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            <div className="min-w-0">
              <div className="text-xs text-[var(--muted-foreground)]">{t("home.income")}</div>
              <div className="text-base font-medium text-[var(--success)]">{formatSigned(MOCK.income)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 border-l border-[var(--border)] pl-4">
            <span className="h-2 w-2 rounded-full bg-[var(--expense)]" />
            <div className="min-w-0">
              <div className="text-xs text-[var(--muted-foreground)]">{t("home.expenses")}</div>
              <div className="text-base font-medium text-[var(--expense)]">{formatSigned(MOCK.expenses)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mb-8 grid grid-cols-4 gap-3">
        {quick.map(({ key, icon: Icon, primary, onClick }) => (
          <button key={key} onClick={onClick} className="flex flex-col items-center gap-2">
            <span
              className={`grid h-16 w-16 place-items-center rounded-full ${
                primary ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-[11px] text-[var(--muted-foreground)]">{t(`home.${key}`)}</span>
          </button>
        ))}
      </section>

      {/* Accounts */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("home.myAccounts")}</h2>
          <button className="text-sm text-[var(--gold)]">{t("home.seeAll")}</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MOCK.accounts.map((a) => (
            <div key={a.name} className="card-surface p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--muted)]">
                <a.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
              </span>
              <div className="mt-6 text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{a.type}</div>
              <div className="text-sm">{a.name}</div>
              <div className="mt-2 text-xl font-light text-[var(--gold)]">{formatEUR(a.balance)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly expenses */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("home.monthExpenses")}</h2>
          <span className="text-sm text-[var(--muted-foreground)]">{formatEUR(Math.abs(MOCK.expenses))}</span>
        </div>
        <div className="card-surface space-y-4 p-4">
          {MOCK.categories.map((c) => (
            <div key={c.name}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm">{c.name}</span>
                <span className="text-sm">{formatEUR(c.amount)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${c.percent}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                {t("home.percentOfTotal", { p: c.percent })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <PaywallModal open={ai.paywallOpen} onOpenChange={ai.setPaywallOpen} requiredPlan={ai.required} />
      <PaywallModal open={reportsGate.paywallOpen} onOpenChange={reportsGate.setPaywallOpen} requiredPlan={reportsGate.required} />
    </div>
  );
}
