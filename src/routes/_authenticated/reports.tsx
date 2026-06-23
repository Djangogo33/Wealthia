import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Telescope,
} from "lucide-react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { useTranslation } from "@/lib/strings";
import { formatEUR, formatSigned } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  demoAccounts,
  demoTransactions,
  demoCategories as _demoCats,
} from "@/data/demo";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

type PeriodKey = "thisMonth" | "lastMonth" | "3m" | "6m" | "1y";

const COLORS = {
  green: "#6BAF7A",
  coral: "#D4745A",
  gold: "#C8B99A",
  gray: "#8A8A7A",
  grid: "#1E1E1E",
  text: "#8A8A7A",
};

const PALETTE = ["#C8B99A", "#6BAF7A", "#7BB0B0", "#B89BC9", "#D4745A", "#E0A26B"];

type Tx = {
  id: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  label: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
};

type Acct = { id: string; name: string; balance: number };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function monthsBack(n: number) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - n, d.getDate());
}

function rangeFor(period: PeriodKey): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const today = startOfDay(now);
  if (period === "thisMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end: today, prevStart, prevEnd };
  }
  if (period === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    return { start, end, prevStart, prevEnd };
  }
  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const start = monthsBack(months);
  const prevStart = monthsBack(months * 2);
  const prevEnd = monthsBack(months);
  return { start, end: today, prevStart, prevEnd };
}

function ReportsPage() {
  const { t, lang } = useTranslation();
  const { isDemo } = useDemo();
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");

  const data = useQuery({
    queryKey: ["reports-data", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async (): Promise<{ tx: Tx[]; accounts: Acct[] }> => {
      if (isDemo) {
        return {
          tx: demoTransactions.map((x) => ({
            id: x.id,
            amount: x.amount,
            type: x.type,
            date: x.date,
            label: x.label,
            categoryName: x.category,
            categoryColor: null,
            categoryIcon: null,
          })),
          accounts: demoAccounts.map((a) => ({ id: a.id, name: a.name, balance: a.balance })),
        };
      }
      const [{ data: txs }, { data: accts }] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,amount,type,date,label,category:categories(name,color,icon)")
          .is("deleted_at", null)
          .order("date", { ascending: false }),
        supabase.from("accounts").select("id,name,balance"),
      ]);
      const tx: Tx[] = (txs ?? []).map((r) => {
        const c = (r.category as { name: string; color: string | null; icon: string | null } | null) ?? null;
        return {
          id: r.id as string,
          amount: Number(r.amount),
          type: r.type as "income" | "expense",
          date: r.date as string,
          label: (r.label as string) ?? "",
          categoryName: c?.name ?? "Autre",
          categoryColor: c?.color ?? null,
          categoryIcon: c?.icon ?? null,
        };
      });
      const accounts: Acct[] = (accts ?? []).map((a) => ({
        id: a.id as string,
        name: a.name as string,
        balance: Number(a.balance),
      }));
      return { tx, accounts };
    },
  });

  const txAll = data.data?.tx ?? [];
  const accounts = data.data?.accounts ?? [];

  const range = rangeFor(period);
  const startISO = fmtISO(range.start);
  const endISO = fmtISO(range.end);
  const prevStartISO = fmtISO(range.prevStart);
  const prevEndISO = fmtISO(range.prevEnd);

  const inRange = useMemo(
    () => txAll.filter((x) => x.date >= startISO && x.date <= endISO),
    [txAll, startISO, endISO],
  );
  const inPrev = useMemo(
    () => txAll.filter((x) => x.date >= prevStartISO && x.date <= prevEndISO),
    [txAll, prevStartISO, prevEndISO],
  );

  const income = inRange.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const expenses = inRange.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
  const net = income - expenses;

  const prevIncome = inPrev.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const prevExpenses = inPrev.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);

  const dayMs = 1000 * 60 * 60 * 24;
  const daysInRange = Math.max(
    1,
    Math.round((range.end.getTime() - range.start.getTime()) / dayMs) + 1,
  );
  const avgPerDay = expenses / daysInRange;

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : null;

  const showProjection = period === "thisMonth" || period === "lastMonth";
  let projection: { amount: number; perDay: number; days: number } | null = null;
  if (showProjection) {
    const refDate = period === "thisMonth" ? new Date() : range.end;
    const dim = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
    const elapsed = Math.max(
      1,
      Math.round((refDate.getTime() - range.start.getTime()) / dayMs) + 1,
    );
    const perDay = expenses / elapsed;
    projection = { amount: perDay * dim, perDay, days: dim };
  }

  // Patrimoine (snapshot)
  const totalPatrimoine = accounts.reduce((s, a) => s + a.balance, 0);
  const accountsForChart = accounts
    .map((a, i) => ({
      ...a,
      pct: totalPatrimoine > 0 ? (a.balance / totalPatrimoine) * 100 : 0,
      color: PALETTE[i % PALETTE.length],
    }))
    .sort((a, b) => b.balance - a.balance);

  // Catégories dépenses
  const catMap = new Map<string, { name: string; amount: number; color: string; icon: string | null }>();
  inRange
    .filter((x) => x.type === "expense")
    .forEach((x) => {
      const key = x.categoryName;
      const cur = catMap.get(key) ?? {
        name: key,
        amount: 0,
        color: x.categoryColor ?? PALETTE[catMap.size % PALETTE.length],
        icon: x.categoryIcon,
      };
      cur.amount += x.amount;
      catMap.set(key, cur);
    });
  const categories = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);

  // Top 5 dépenses
  const top5 = inRange
    .filter((x) => x.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Evolution N months
  const monthsToShow =
    period === "thisMonth" || period === "lastMonth"
      ? 3
      : period === "3m"
      ? 3
      : period === "6m"
      ? 6
      : 12;
  const now = new Date();
  const monthsData: { label: string; key: string; income: number; expenses: number; endISO: string }[] = [];
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthsData.push({
      key,
      label: d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short" }),
      income: 0,
      expenses: 0,
      endISO: fmtISO(end),
    });
  }
  txAll.forEach((x) => {
    const k = x.date.slice(0, 7);
    const m = monthsData.find((md) => md.key === k);
    if (!m) return;
    if (x.type === "income") m.income += x.amount;
    else m.expenses += x.amount;
  });

  // Net worth evolution: current total - all tx after end of each month
  const netWorthSeries = monthsData.map((m) => {
    const after = txAll.filter((x) => x.date > m.endISO);
    const delta = after.reduce(
      (s, x) => s + (x.type === "income" ? x.amount : -x.amount),
      0,
    );
    return { label: m.label, value: totalPatrimoine - delta };
  });

  const showNetWorth = period === "3m" || period === "6m" || period === "1y";

  const periods: { k: PeriodKey; label: string }[] = [
    { k: "thisMonth", label: t("reports.periodThisMonth") },
    { k: "lastMonth", label: t("reports.periodLastMonth") },
    { k: "3m", label: t("reports.period3M") },
    { k: "6m", label: t("reports.period6M") },
    { k: "1y", label: t("reports.period1Y") },
  ];

  const savingsBarPct = savingsRate !== null ? Math.min(100, Math.max(0, savingsRate)) : 0;
  const expensesOverIncomePct = income > 0 ? (expenses / income) * 100 : expenses > 0 ? 100 : 0;
  const savedPct = income > 0 ? Math.max(0, ((income - expenses) / income) * 100) : 0;

  function deltaPct(curr: number, prev: number): number | null {
    if (prev <= 0) return null;
    return ((curr - prev) / prev) * 100;
  }
  const dIncome = deltaPct(income, prevIncome);
  const dExpenses = deltaPct(expenses, prevExpenses);
  const hideCompare = period === "1y";

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-24">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t("reports.back")}
          className="grid h-10 w-10 place-items-center rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
      </header>

      <div className="sticky top-0 z-10 -mx-5 mb-6 bg-[var(--background)]/95 px-5 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
          {periods.map((p) => {
            const active = p.k === period;
            return (
              <button
                key={p.k}
                onClick={() => setPeriod(p.k)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--gold)] text-[var(--primary-foreground)]"
                    : "border border-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {isDemo && (
        <div className="mb-4 text-[11px] text-[var(--muted-foreground)]">
          {t("reports.limitedData")}
        </div>
      )}

      {/* SECTION 1 — Savings Rate */}
      <section className="card-surface mb-5 p-5">
        <div className="label-caps">{t("reports.savingsRateThisMonth")}</div>
        {savingsRate === null ? (
          <>
            <div className="mt-3 text-4xl font-light text-[var(--muted-foreground)]">—</div>
            <div className="mt-2 text-sm text-[var(--muted-foreground)]">{t("reports.noIncome")}</div>
          </>
        ) : (
          <>
            <div
              className="mt-3 text-4xl font-light"
              style={{ color: savingsRate >= 0 ? COLORS.green : COLORS.coral }}
            >
              {savingsRate >= 0 ? "+" : ""}
              {savingsRate.toFixed(1)}%
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: savingsRate >= 0 ? COLORS.green : COLORS.coral }}
              />
              <span className="text-[var(--muted-foreground)]">
                {savingsRate >= 0
                  ? t("reports.savingsPositive", { rate: savingsRate.toFixed(1) })
                  : t("reports.savingsNegative")}
              </span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${savingsBarPct}%`,
                  background: savingsRate >= 0 ? COLORS.green : COLORS.coral,
                }}
              />
            </div>
          </>
        )}
      </section>

      {/* SECTION 2 — KPI Grid */}
      <section className="mb-5 grid grid-cols-2 gap-3">
        <KpiCard
          icon={<ArrowDownRight className="h-4 w-4" />}
          label={t("reports.revenues")}
          value={formatEUR(income)}
          color={COLORS.green}
          delta={hideCompare ? null : dIncome}
          deltaGoodWhenPositive
          t={t}
        />
        <KpiCard
          icon={<ArrowUpRight className="h-4 w-4" />}
          label={t("reports.expenses")}
          value={formatEUR(expenses)}
          color={COLORS.coral}
          delta={hideCompare ? null : dExpenses}
          deltaGoodWhenPositive={false}
          t={t}
        />
        <KpiCard
          icon={<ArrowDownRight className="h-4 w-4 rotate-180" />}
          label={t("reports.net")}
          value={formatSigned(net)}
          color={net >= 0 ? COLORS.green : COLORS.coral}
          delta={null}
          deltaGoodWhenPositive
          t={t}
        />
        <KpiCard
          icon={<CalendarDays className="h-4 w-4" />}
          label={t("reports.avgPerDay")}
          value={formatEUR(avgPerDay)}
          color={COLORS.gray}
          delta={null}
          deltaGoodWhenPositive
          t={t}
        />
      </section>

      {/* SECTION 3 — Projection */}
      {showProjection && projection && (
        <section className="card-surface mb-5 p-5">
          <div className="label-caps flex items-center gap-2">
            <Telescope className="h-4 w-4" /> {t("reports.projection")}
          </div>
          <div className="mt-3 text-3xl font-light" style={{ color: COLORS.gold }}>
            {formatEUR(projection.amount)}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            {t("reports.projectionHint", {
              avg: projection.perDay.toFixed(2),
              days: projection.days,
            })}
          </div>
        </section>
      )}

      {/* SECTION 4 — Rev/Exp split */}
      <section className="card-surface mb-5 p-5">
        <div className="mb-3 text-sm font-medium">{t("reports.repartitionRevExp")}</div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          {income > 0 && expenses < income ? (
            <>
              <div style={{ width: `${expensesOverIncomePct}%`, background: COLORS.coral }} />
              <div style={{ width: `${savedPct}%`, background: COLORS.green }} />
            </>
          ) : expensesOverIncomePct > 100 ? (
            <>
              <div style={{ width: `100%`, background: COLORS.coral, position: "relative" }}>
                <div
                  className="absolute right-0 top-0 h-full"
                  style={{
                    width: `${Math.min(40, expensesOverIncomePct - 100)}%`,
                    background: "#7A2E1F",
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ width: `${expensesOverIncomePct}%`, background: COLORS.coral }} />
          )}
        </div>
        <div className="mt-3 flex items-center gap-6 text-xs">
          <Legend color={COLORS.coral} label={`${t("reports.spent")}  ${Math.round(expensesOverIncomePct)}%`} />
          <Legend color={COLORS.green} label={`${t("reports.saved")}  ${Math.round(Math.max(0, savedPct))}%`} />
        </div>
      </section>

      {/* SECTION 5 — Patrimoine */}
      <section className="card-surface mb-5 p-5">
        <div className="text-sm font-medium">{t("reports.patrimoine")}</div>
        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
          {t("reports.patrimoineTotal")} : {formatEUR(totalPatrimoine)}
        </div>
        <div className="mt-4 space-y-3">
          {accountsForChart.map((a) => (
            <div key={a.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                  {a.name}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {a.pct.toFixed(1)}% · {formatEUR(a.balance)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6 — Donut */}
      <section className="card-surface mb-5 p-5">
        <div className="text-sm font-medium">{t("reports.expensesByCategory")}</div>
        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
          {t("reports.totalSpent")} : {formatEUR(expenses)}
        </div>
        {categories.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">—</div>
        ) : (
          <>
            <div className="mt-4 h-[240px] w-full">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie
                    data={categories}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="#0D0D0D"
                    strokeWidth={2}
                  >
                    {categories.map((c, i) => (
                      <Cell key={c.name} fill={c.color || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => formatEUR(v)}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categories.map((c, i) => {
                const pct = expenses > 0 ? (c.amount / expenses) * 100 : 0;
                return (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: c.color || PALETTE[i % PALETTE.length] }}
                      />
                      {c.name}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {pct.toFixed(1)}% · {formatEUR(c.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* SECTION 7 — Top 5 */}
      <section className="card-surface mb-5 p-5">
        <div className="mb-3 text-sm font-medium">{t("reports.top5")}</div>
        {top5.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--muted-foreground)]">—</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {top5.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                  <DynamicIcon name={tx.categoryIcon ?? "circle"} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{tx.label}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">{tx.categoryName}</div>
                </div>
                <div className="text-sm font-medium" style={{ color: COLORS.coral }}>
                  {formatSigned(-tx.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SECTION 8 — Bar Chart */}
      <section className="card-surface mb-5 p-5">
        <div className="mb-3 text-sm font-medium">{t("reports.evolution")}</div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer>
            <BarChart data={monthsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="label" stroke={COLORS.text} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={COLORS.text} fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                cursor={{ fill: "#1A1A1A" }}
                contentStyle={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatEUR(v)}
              />
              <Bar dataKey="income" fill={COLORS.green} radius={[6, 6, 0, 0]} name={t("reports.revenues")} />
              <Bar dataKey="expenses" fill={COLORS.coral} radius={[6, 6, 0, 0]} name={t("reports.expenses")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <Legend color={COLORS.green} label={t("reports.revenues")} />
          <Legend color={COLORS.coral} label={t("reports.expenses")} />
        </div>
      </section>

      {/* SECTION 9 — Net worth */}
      {showNetWorth && (
        <section className="card-surface mb-5 p-5">
          <div className="mb-3 text-sm font-medium">{t("reports.netWorthEvolution")}</div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer>
              <AreaChart data={netWorthSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="label" stroke={COLORS.text} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.text} fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatEUR(v)}
                />
                <Area type="monotone" dataKey="value" stroke={COLORS.gold} strokeWidth={2} fill="url(#goldArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
  delta,
  deltaGoodWhenPositive,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delta: number | null;
  deltaGoodWhenPositive: boolean;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  const deltaColor =
    delta === null
      ? COLORS.gray
      : (delta >= 0) === deltaGoodWhenPositive
      ? COLORS.green
      : COLORS.coral;
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color }}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-xl font-light" style={{ color }}>
        {value}
      </div>
      {delta !== null && (
        <div className="mt-1 text-[11px]" style={{ color: deltaColor }}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% {t("reports.vsLastPeriod")}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
