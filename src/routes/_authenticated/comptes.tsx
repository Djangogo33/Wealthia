import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/strings";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  PiggyBank,
  BookText,
  Wallet,
  MoreHorizontal,
  Trash2,
  Lock,
  Calendar as CalendarIcon,
  HandCoins,
  Receipt,
  Tag,
} from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import {
  demoAccounts,
  demoBudgets,
  demoDebts,
  demoSubscriptions,
} from "@/data/demo";
import { formatEUR } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { PaywallModal } from "@/components/paywall-modal";
import type { Database } from "@/integrations/supabase/types";

type AccountType = Database["public"]["Enums"]["account_type"];
type BudgetPeriod = Database["public"]["Enums"]["budget_period"];
type SubFreq = Database["public"]["Enums"]["sub_frequency"];
type DebtType = "debt" | "loan";

type Account = { id: string; name: string; type: AccountType; balance: number; currency: string };
type Budget = {
  id: string;
  category_id: string | null;
  amount_limit: number;
  period: BudgetPeriod;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  spent: number;
};
type Debt = {
  id: string;
  label: string;
  type: DebtType;
  total_amount: number;
  remaining_amount: number;
  due_date: string | null;
};
type Subscription = {
  id: string;
  name: string;
  amount: number;
  frequency: SubFreq;
  next_billing_date: string | null;
  category_id: string | null;
};
type Category = { id: string; name: string; icon: string | null; color: string | null };

export const Route = createFileRoute("/_authenticated/comptes")({
  component: ComptesPage,
});

function ComptesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState<null | "account" | "budget" | "debt" | "sub">(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "account" | "sub" | "debt"; id: string }
    | null
  >(null);

  // ===== Queries =====
  const accountsQuery = useQuery({
    queryKey: ["accounts-full", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) return demoAccounts as Account[];
      const { data, error } = await supabase
        .from("accounts")
        .select("id,name,type,balance,currency")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-all", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) return [] as Category[];
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,color")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const budgetsQuery = useQuery({
    queryKey: ["budgets", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) {
        return demoBudgets.map((b) => ({
          id: b.id,
          category_id: b.id,
          amount_limit: b.limit,
          period: b.period,
          category: { id: b.id, name: b.category, icon: b.category_icon, color: null },
          spent: b.spent,
        })) as Budget[];
      }
      const { data: bs, error } = await supabase
        .from("budgets")
        .select("id,category_id,amount_limit,period,category:categories(id,name,icon,color)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data: txs } = await supabase
        .from("transactions")
        .select("category_id,amount,type")
        .is("deleted_at", null)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .eq("type", "expense");
      const spentByCat = new Map<string, number>();
      (txs ?? []).forEach((tx) => {
        if (!tx.category_id) return;
        spentByCat.set(tx.category_id, (spentByCat.get(tx.category_id) ?? 0) + Number(tx.amount));
      });
      return (bs ?? []).map((b) => ({
        ...b,
        spent: b.category_id ? spentByCat.get(b.category_id) ?? 0 : 0,
      })) as Budget[];
    },
  });

  const debtsQuery = useQuery({
    queryKey: ["debts", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) return demoDebts as Debt[];
      const { data, error } = await supabase
        .from("debts")
        .select("id,label,type,total_amount,remaining_amount,due_date")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Debt[];
    },
  });

  const subsQuery = useQuery({
    queryKey: ["subs", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) return demoSubscriptions.map((s) => ({ ...s, category_id: null })) as Subscription[];
      const { data, error } = await supabase
        .from("subscriptions_tracked")
        .select("id,name,amount,frequency,next_billing_date,category_id")
        .is("deleted_at", null)
        .order("next_billing_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subscription[];
    },
  });

  // ===== Delete mutation =====
  const deleteMut = useMutation({
    mutationFn: async (target: { kind: "account" | "sub" | "debt"; id: string }) => {
      if (isDemo) {
        toast.info(t("demo.writeBlocked"));
        return;
      }
      const table =
        target.kind === "account"
          ? "accounts"
          : target.kind === "sub"
            ? "subscriptions_tracked"
            : "debts";
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", target.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts-full"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["subs"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-24">
      <h1 className="text-4xl font-semibold tracking-tight mb-6">{t("accounts.title")}</h1>

      <Section
        title={t("accounts.sectionAccounts")}
        onAdd={() => setAddOpen("account")}
        addLabel={t("accounts.add")}
      >
        {accountsQuery.data && accountsQuery.data.length > 0 ? (
          <div className="space-y-2">
            {accountsQuery.data.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                onDelete={() => setPendingDelete({ kind: "account", id: a.id })}
              />
            ))}
          </div>
        ) : (
          <Empty icon={<Wallet className="h-6 w-6" />} text={t("accounts.emptyAccounts")} />
        )}
      </Section>

      <Section
        title={t("accounts.sectionBudgets")}
        onAdd={() => setAddOpen("budget")}
        addLabel={t("accounts.add")}
      >
        {budgetsQuery.data && budgetsQuery.data.length > 0 ? (
          <div className="space-y-3">
            {budgetsQuery.data.map((b) => (
              <BudgetCard key={b.id} budget={b} />
            ))}
          </div>
        ) : (
          <Empty icon={<Tag className="h-6 w-6" />} text={t("accounts.emptyBudgets")} />
        )}
      </Section>

      <Section
        title={t("accounts.sectionDebts")}
        onAdd={() => setAddOpen("debt")}
        addLabel={t("accounts.add")}
      >
        {debtsQuery.data && debtsQuery.data.length > 0 ? (
          <div className="space-y-3">
            {debtsQuery.data.map((d) => (
              <DebtCard
                key={d.id}
                debt={d}
                onDelete={() => setPendingDelete({ kind: "debt", id: d.id })}
              />
            ))}
          </div>
        ) : (
          <Empty icon={<HandCoins className="h-6 w-6" />} text={t("accounts.emptyDebts")} />
        )}
      </Section>

      <Section
        title={t("accounts.sectionSubscriptions")}
        onAdd={() => setAddOpen("sub")}
        addLabel={t("accounts.add")}
      >
        {subsQuery.data && subsQuery.data.length > 0 ? (
          <div className="space-y-2">
            {subsQuery.data.map((s) => (
              <SubscriptionCard
                key={s.id}
                sub={s}
                onDelete={() => setPendingDelete({ kind: "sub", id: s.id })}
              />
            ))}
          </div>
        ) : (
          <Empty icon={<Receipt className="h-6 w-6" />} text={t("accounts.emptySubscriptions")} />
        )}
      </Section>

      {/* Add sheets */}
      {addOpen === "account" && (
        <AddAccountSheet
          open
          onClose={() => setAddOpen(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["accounts-full"] });
            qc.invalidateQueries({ queryKey: ["accounts"] });
            qc.invalidateQueries({ queryKey: ["home-stats"] });
          }}
        />
      )}
      {addOpen === "budget" && (
        <AddBudgetSheet
          open
          categories={categoriesQuery.data ?? []}
          onClose={() => setAddOpen(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["budgets"] })}
        />
      )}
      {addOpen === "debt" && (
        <AddDebtSheet
          open
          onClose={() => setAddOpen(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["debts"] })}
        />
      )}
      {addOpen === "sub" && (
        <AddSubSheet
          open
          categories={categoriesQuery.data ?? []}
          onClose={() => setAddOpen(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["subs"] })}
        />
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("accounts.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("accounts.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteMut.mutate(pendingDelete);
                setPendingDelete(null);
              }}
            >
              {t("accounts.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================== Section =====================

function Section({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={onAdd}
          className="text-sm font-medium text-[#C8B99A] hover:opacity-80"
        >
          + {addLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="card-surface flex flex-col items-center gap-2 py-8 text-[var(--muted-foreground)]">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ===================== Cards =====================

const ACCOUNT_ICON: Record<AccountType, typeof CreditCard> = {
  courant: CreditCard,
  epargne: PiggyBank,
  livret: BookText,
  liquide: Wallet,
  autre: MoreHorizontal,
};

function accountTypeLabel(t: (k: string) => string, type: AccountType) {
  return {
    courant: t("accounts.typeChecking"),
    epargne: t("accounts.typeSavings"),
    livret: t("accounts.typeBooklet"),
    liquide: t("accounts.typeCash"),
    autre: t("accounts.typeOther"),
  }[type];
}

function AccountCard({ account, onDelete }: { account: Account; onDelete: () => void }) {
  const { t } = useTranslation();
  const Icon = ACCOUNT_ICON[account.type];
  return (
    <div className="card-surface flex items-center gap-3 p-3">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--foreground)]/10">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{account.name}</div>
        <div className="text-xs text-[var(--muted-foreground)]">
          {accountTypeLabel(t, account.type)}
        </div>
      </div>
      <div className="font-semibold">{formatEUR(Number(account.balance))}</div>
      <button
        onClick={onDelete}
        aria-label={t("accounts.delete")}
        className="grid h-9 w-9 place-items-center rounded-full border border-[#D4745A]/40 text-[#D4745A] hover:bg-[#D4745A]/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const { t } = useTranslation();
  const limit = Number(budget.amount_limit);
  const spent = Number(budget.spent);
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const over = spent > limit;
  const remaining = limit - spent;
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <DynamicIcon name={budget.category?.icon ?? "circle"} size={20} className="text-[#C8B99A]" />
          <span className="font-semibold truncate">{budget.category?.name ?? "—"}</span>
        </div>
        <div className="text-sm tabular-nums">
          {formatEUR(spent)} / {formatEUR(limit)}
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--foreground)]/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${over ? 100 : pct}%`,
            backgroundColor: over ? "#D4745A" : "#C8B99A",
          }}
        />
      </div>
      <div className={`mt-1.5 text-xs ${over ? "text-[#D4745A]" : "text-[var(--muted-foreground)]"}`}>
        {over
          ? `${t("budgets.over")} ${formatEUR(spent - limit)}`
          : `${formatEUR(Math.max(0, remaining))} ${t("budgets.remaining")}`}
      </div>
    </div>
  );
}

function DebtCard({ debt, onDelete }: { debt: Debt; onDelete: () => void }) {
  const { t } = useTranslation();
  const total = Number(debt.total_amount);
  const remaining = Number(debt.remaining_amount);
  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;
  return (
    <div className="card-surface p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--foreground)]/10">
          <HandCoins className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{debt.label}</div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {debt.type === "loan" ? t("debts.typeLoan") : t("debts.typeDebt")}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums text-[#D4745A]">
            {formatEUR(remaining)}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] tabular-nums">
            / {formatEUR(total)}
          </div>
        </div>
        <button
          onClick={onDelete}
          aria-label={t("accounts.delete")}
          className="grid h-9 w-9 place-items-center rounded-full border border-[#D4745A]/40 text-[#D4745A] hover:bg-[#D4745A]/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--foreground)]/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#C8B99A] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {debt.due_date && (
        <div className="mt-1.5 text-xs text-[var(--muted-foreground)]">
          {new Date(debt.due_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({ sub, onDelete }: { sub: Subscription; onDelete: () => void }) {
  const { t } = useTranslation();
  const freqLabel = {
    monthly: t("subscriptions.freqMonthly"),
    yearly: t("subscriptions.freqYearly"),
    weekly: t("subscriptions.freqWeekly"),
  }[sub.frequency];
  return (
    <div className="card-surface flex items-center gap-3 p-3">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--foreground)]/10">
        <Receipt className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{sub.name}</div>
        <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
          <CalendarIcon className="h-3 w-3" />
          {sub.next_billing_date
            ? `${t("subscriptions.nextBilling")}: ${new Date(sub.next_billing_date).toLocaleDateString()}`
            : "—"}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold tabular-nums">{formatEUR(Number(sub.amount))}</div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
          {freqLabel}
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label={t("accounts.delete")}
        className="grid h-9 w-9 place-items-center rounded-full border border-[#D4745A]/40 text-[#D4745A] hover:bg-[#D4745A]/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ===================== Sheets =====================

function FormShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl sm:max-w-lg sm:mx-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function Pill({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        active
          ? "bg-[var(--foreground)] text-[var(--background)] border-transparent"
          : "border-[var(--foreground)]/20 text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function AddAccountSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const gate = useFeatureGate("multi_currency");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("courant");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);

  const types: { v: AccountType; label: string }[] = [
    { v: "courant", label: t("accounts.typeChecking") },
    { v: "epargne", label: t("accounts.typeSavings") },
    { v: "livret", label: t("accounts.typeBooklet") },
    { v: "liquide", label: t("accounts.typeCash") },
    { v: "autre", label: t("accounts.typeOther") },
  ];

  async function submit() {
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      onClose();
      return;
    }
    if (!user || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: name.trim(),
      type,
      balance: Number(balance || 0),
      currency,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <>
      <FormShell open={open} onClose={onClose} title={t("accounts.addAccountTitle")}>
        <Field label={t("accounts.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Type">
          <div className="flex flex-wrap gap-2">
            {types.map((tp) => (
              <Pill key={tp.v} active={type === tp.v} onClick={() => setType(tp.v)}>
                {tp.label}
              </Pill>
            ))}
          </div>
        </Field>
        <Field label={t("accounts.initialBalance")}>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              €
            </span>
          </div>
        </Field>
        <Field label={t("accounts.currency")}>
          <div className="flex flex-wrap gap-2">
            <Pill active={currency === "EUR"} onClick={() => setCurrency("EUR")}>
              EUR
            </Pill>
            {(["USD", "GBP", "CHF"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => gate.check() && setCurrency(c)}
                className="px-3 py-1.5 rounded-full text-sm border border-[var(--foreground)]/20 text-[var(--muted-foreground)] flex items-center gap-1.5 opacity-60"
              >
                <Lock className="h-3 w-3" />
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Button onClick={submit} disabled={saving || !name.trim()} className="w-full">
          {t("accounts.save")}
        </Button>
      </FormShell>
      <PaywallModal
        open={gate.paywallOpen}
        onOpenChange={gate.setPaywallOpen}
        requiredPlan={gate.required}
      />
    </>
  );
}

function AddBudgetSheet({
  open,
  onClose,
  onSaved,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      onClose();
      return;
    }
    if (!user || !amount) return;
    setSaving(true);
    const { error } = await supabase.from("budgets").insert({
      user_id: user.id,
      category_id: categoryId || null,
      amount_limit: Number(amount),
      period,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <FormShell open={open} onClose={onClose} title={t("accounts.addBudgetTitle")}>
      <Field label={t("budgets.category")}>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left ${
                categoryId === c.id
                  ? "border-[#C8B99A] bg-[#C8B99A]/10"
                  : "border-[var(--foreground)]/15"
              }`}
            >
              <span>{c.icon ?? "📦"}</span>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("budgets.cap")}>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">€</span>
        </div>
      </Field>
      <Field label={t("budgets.period")}>
        <div className="flex gap-2">
          <Pill active={period === "monthly"} onClick={() => setPeriod("monthly")}>
            {t("budgets.periodMonthly")}
          </Pill>
          <Pill active={period === "weekly"} onClick={() => setPeriod("weekly")}>
            {t("budgets.periodWeekly")}
          </Pill>
        </div>
      </Field>
      <Button onClick={submit} disabled={saving || !amount} className="w-full">
        {t("accounts.save")}
      </Button>
    </FormShell>
  );
}

function AddDebtSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<DebtType>("debt");
  const [total, setTotal] = useState("");
  const [remaining, setRemaining] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      onClose();
      return;
    }
    if (!user || !label.trim() || !total) return;
    setSaving(true);
    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      label: label.trim(),
      type,
      total_amount: Number(total),
      remaining_amount: Number(remaining || total),
      due_date: dueDate || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <FormShell open={open} onClose={onClose} title={t("accounts.addDebtTitle")}>
      <Field label={t("debts.label")}>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </Field>
      <Field label="Type">
        <div className="flex gap-2">
          <Pill active={type === "debt"} onClick={() => setType("debt")}>
            {t("debts.typeDebt")}
          </Pill>
          <Pill active={type === "loan"} onClick={() => setType("loan")}>
            {t("debts.typeLoan")}
          </Pill>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("debts.total")}>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">€</span>
          </div>
        </Field>
        <Field label={t("debts.remaining")}>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">€</span>
          </div>
        </Field>
      </div>
      <Field label={t("debts.dueDate")}>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Button onClick={submit} disabled={saving || !label.trim() || !total} className="w-full">
        {t("accounts.save")}
      </Button>
    </FormShell>
  );
}

function AddSubSheet({
  open,
  onClose,
  onSaved,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<SubFreq>("monthly");
  const [nextDate, setNextDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      onClose();
      return;
    }
    if (!user || !name.trim() || !amount) return;
    setSaving(true);
    const { error } = await supabase.from("subscriptions_tracked").insert({
      user_id: user.id,
      name: name.trim(),
      amount: Number(amount),
      frequency,
      next_billing_date: nextDate || null,
      category_id: categoryId || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <FormShell open={open} onClose={onClose} title={t("accounts.addSubTitle")}>
      <Field label={t("subscriptions.name")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label={t("subscriptions.amount")}>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">€</span>
        </div>
      </Field>
      <Field label={t("subscriptions.freq")}>
        <div className="flex flex-wrap gap-2">
          <Pill active={frequency === "monthly"} onClick={() => setFrequency("monthly")}>
            {t("subscriptions.freqMonthly")}
          </Pill>
          <Pill active={frequency === "yearly"} onClick={() => setFrequency("yearly")}>
            {t("subscriptions.freqYearly")}
          </Pill>
          <Pill active={frequency === "weekly"} onClick={() => setFrequency("weekly")}>
            {t("subscriptions.freqWeekly")}
          </Pill>
        </div>
      </Field>
      <Field label={t("subscriptions.nextBilling")}>
        <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
      </Field>
      {categories.length > 0 && (
        <Field label={t("subscriptions.category")}>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left ${
                  categoryId === c.id
                    ? "border-[#C8B99A] bg-[#C8B99A]/10"
                    : "border-[var(--foreground)]/15"
                }`}
              >
                <span>{c.icon ?? "📦"}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </Field>
      )}
      <Button onClick={submit} disabled={saving || !name.trim() || !amount} className="w-full">
        {t("accounts.save")}
      </Button>
    </FormShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
