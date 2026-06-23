import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/strings";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatEUR, formatSigned } from "@/lib/format";
import { Plus, PieChart, Sparkles, TrendingUp, CreditCard, Wallet, BarChart3 } from "lucide-react";
import { useState } from "react";
import { PaywallModal } from "@/components/paywall-modal";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { useDemo } from "@/hooks/use-demo";
import { demoAccounts, demoTransactions, demoUser } from "@/data/demo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  component: Accueil,
});

const ICON_BY_TYPE: Record<string, typeof CreditCard> = {
  courant: CreditCard,
  liquide: Wallet,
  epargne: Wallet,
  livret: Wallet,
  autre: Wallet,
};

function Accueil() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const { isDemo } = useDemo();
  const ai = useFeatureGate("ai_advisor");

  const stats = useQuery({
    queryKey: ["home-stats", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) {
        const totalBalance = demoAccounts.reduce((s, a) => s + a.balance, 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const monthTx = demoTransactions.filter((t) => t.date >= monthStart);
        let income = 0;
        let expenses = 0;
        const catMap = new Map<string, { name: string; amount: number }>();
        for (const tx of monthTx) {
          if (tx.type === "income") income += tx.amount;
          else {
            expenses += tx.amount;
            const cur = catMap.get(tx.category) ?? { name: tx.category, amount: 0 };
            cur.amount += tx.amount;
            catMap.set(tx.category, cur);
          }
        }
        const categories = Array.from(catMap.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
          .map((c) => ({
            ...c,
            percent: expenses > 0 ? Math.round((c.amount / expenses) * 100) : 0,
          }));
        return {
          totalBalance,
          income,
          expenses,
          accounts: demoAccounts.slice(0, 4).map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            balance: a.balance,
          })),
          categories,
        };
      }
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const [{ data: accts }, { data: monthTx }] = await Promise.all([
        supabase.from("accounts").select("id,name,type,balance").order("created_at"),
        supabase
          .from("transactions")
          .select("amount,type,category_id,category:categories(name)")
          .is("deleted_at", null)
          .gte("date", monthStart),
      ]);
      const accounts = accts ?? [];
      const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
      let income = 0;
      let expenses = 0;
      const catMap = new Map<string, { name: string; amount: number }>();
      for (const tx of monthTx ?? []) {
        const a = Number(tx.amount);
        if (tx.type === "income") income += a;
        else {
          expenses += a;
          const key = tx.category_id ?? "_none";
          const name = (tx.category as { name: string } | null)?.name ?? "Autre";
          const cur = catMap.get(key) ?? { name, amount: 0 };
          cur.amount += a;
          catMap.set(key, cur);
        }
      }
      const categories = Array.from(catMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((c) => ({
          ...c,
          percent: expenses > 0 ? Math.round((c.amount / expenses) * 100) : 0,
        }));
      return {
        totalBalance,
        income,
        expenses,
        accounts: accounts.slice(0, 4),
        categories,
      };
    },
  });

  const s = stats.data;
  const quick = [
    { key: "quickAdd", icon: Plus, primary: true, to: "/transactions" as const },
    { key: "quickReports", icon: PieChart, to: "/reports" as const },
    { key: "quickAI", icon: Sparkles, onClick: () => ai.check() },
    { key: "quickStocks", icon: TrendingUp, to: "/bourse" as const },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-24">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-semibold tracking-tight">{t("home.hello")}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t("home.overview")}</p>
          {(isDemo ? demoUser.name : profile?.name) && (
            <p className="mt-0.5 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">{isDemo ? demoUser.name : profile?.name}</p>
          )}
        </div>
        <Link
          to="/reports"
          aria-label={t("reports.title")}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]"
        >
          <BarChart3 className="h-5 w-5" />
        </Link>
      </header>

      <section
        className="card-surface relative mb-7 overflow-hidden p-6"
        style={{ backgroundImage: "var(--gradient-card)" }}
      >
        <div className="label-caps">{t("home.totalBalance")}</div>
        <div className="mt-3 text-5xl font-light text-[var(--gold)]">
          {formatEUR(s?.totalBalance ?? 0)}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            <div className="min-w-0">
              <div className="text-xs text-[var(--muted-foreground)]">{t("home.income")}</div>
              <div className="text-base font-medium text-[var(--success)]">{formatSigned(s?.income ?? 0)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 border-l border-[var(--border)] pl-4">
            <span className="h-2 w-2 rounded-full bg-[var(--expense)]" />
            <div className="min-w-0">
              <div className="text-xs text-[var(--muted-foreground)]">{t("home.expenses")}</div>
              <div className="text-base font-medium text-[var(--expense)]">
                {formatSigned(-(s?.expenses ?? 0))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-4 gap-3">
        {quick.map(({ key, icon: Icon, primary, onClick, to }) => {
          const inner = (
            <>
              <span
                className={`grid h-16 w-16 place-items-center rounded-full ${
                  primary
                    ? "bg-[var(--gold)] text-[var(--primary-foreground)]"
                    : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]"
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)]">{t(`home.${key}`)}</span>
            </>
          );
          return to ? (
            <Link key={key} to={to} className="flex flex-col items-center gap-2">
              {inner}
            </Link>
          ) : (
            <button key={key} onClick={onClick} className="flex flex-col items-center gap-2">
              {inner}
            </button>
          );
        })}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("home.myAccounts")}</h2>
          <Link to="/comptes" className="text-sm text-[var(--gold)]">{t("home.seeAll")}</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(s?.accounts ?? []).map((a) => {
            const Icon = ICON_BY_TYPE[a.type] ?? Wallet;
            return (
              <div key={a.id} className="card-surface p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--muted)]">
                  <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                </span>
                <div className="mt-6 text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{a.type}</div>
                <div className="text-sm">{a.name}</div>
                <div className="mt-2 text-xl font-light text-[var(--gold)]">{formatEUR(Number(a.balance))}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("home.monthExpenses")}</h2>
          <span className="text-sm text-[var(--muted-foreground)]">{formatEUR(s?.expenses ?? 0)}</span>
        </div>
        <div className="card-surface space-y-4 p-4">
          {(s?.categories ?? []).length === 0 ? (
            <div className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              {formatEUR(0)}
            </div>
          ) : (
            s!.categories.map((c) => (
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
            ))
          )}
        </div>
      </section>

      <PaywallModal open={ai.paywallOpen} onOpenChange={ai.setPaywallOpen} requiredPlan={ai.required} />
    </div>
  );
}
