import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { aiCategorizeTransaction } from "@/lib/transactions.functions";
import { useDemo } from "@/hooks/use-demo";
import { demoAccounts, demoTransactions } from "@/data/demo";
import type { Database } from "@/integrations/supabase/types";

type TxType = "expense" | "income";
type Filter = "all" | TxType;

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: Database["public"]["Enums"]["category_type"];
};
type Account = {
  id: string;
  name: string;
  type: Database["public"]["Enums"]["account_type"];
  balance: number;
};
type Tx = {
  id: string;
  amount: number;
  label: string;
  type: TxType;
  date: string;
  notes: string | null;
  ai_categorized: boolean;
  account_id: string | null;
  category_id: string | null;
  created_at: string;
  category: { name: string } | null;
  account: { name: string } | null;
};

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Tx | null>(null);

  const txQuery = useQuery({
    queryKey: ["transactions", isDemo ? "demo" : user?.id, filter, limit],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) {
        const filtered = demoTransactions
          .filter((tx) => filter === "all" || tx.type === filter)
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, limit);
        return filtered.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          label: tx.label,
          type: tx.type,
          date: tx.date,
          notes: null,
          ai_categorized: tx.ai_categorized,
          account_id: tx.account,
          category_id: tx.category,
          created_at: tx.date,
          category: { name: tx.category },
          account: { name: tx.account },
        })) as Tx[];
      }
      let q = supabase
        .from("transactions")
        .select(
          "id,amount,label,type,date,notes,ai_categorized,account_id,category_id,created_at,category:categories(name),account:accounts(name)",
        )
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (filter !== "all") q = q.eq("type", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Tx[];
    },
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) {
        return demoAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balance: a.balance,
        })) as Account[];
      }
      const { data, error } = await supabase
        .from("accounts")
        .select("id,name,type,balance")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async () => {
      if (isDemo) return [] as Category[];
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,color,type")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tx: Tx) => {
      const { error } = await supabase
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", tx.id);
      if (error) throw error;
      // Reverse account balance
      if (tx.account_id) {
        const delta = tx.type === "income" ? -tx.amount : tx.amount;
        const acct = accountsQuery.data?.find((a) => a.id === tx.account_id);
        if (acct) {
          await supabase
            .from("accounts")
            .update({ balance: Number(acct.balance) + delta })
            .eq("id", tx.account_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
      toast.success(t("transactions.delete.confirmCta"));
    },
  });

  const txs = txQuery.data ?? [];
  const groups = useMemo(() => groupByDate(txs), [txs]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-24">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-semibold tracking-tight">{t("transactions.title")}</h1>
        <button
          onClick={() => setAddOpen(true)}
          aria-label={t("transactions.add.submit")}
          className="grid h-12 w-12 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)] shadow-md transition active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* Filter pills */}
      <div className="mb-6 flex gap-2">
        {(["all", "income", "expense"] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setLimit(PAGE_SIZE);
              }}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                active
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "border border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {t(`transactions.filter.${f}`)}
            </button>
          );
        })}
      </div>

      {/* List */}
      {txQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-surface h-20 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {groups.map(({ date, items }) => (
            <section key={date}>
              <div className="label-caps mb-2 px-1">{formatDateHeader(date)}</div>
              <div className="card-surface overflow-hidden">
                {items.map((tx, i) => (
                  <div key={tx.id}>
                    {i > 0 && <div className="ml-[76px] h-px bg-[var(--border)]" />}
                    <TxRow tx={tx} onDelete={() => setPendingDelete(tx)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {txs.length >= limit && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--muted-foreground)]"
              >
                {t("transactions.loadMore")}
              </button>
            </div>
          )}
        </div>
      )}

      <AddTransactionSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        accounts={accountsQuery.data ?? []}
        categories={categoriesQuery.data ?? []}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transactions.delete.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>{pendingDelete?.label}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("transactions.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteMutation.mutate(pendingDelete);
                setPendingDelete(null);
              }}
              className="bg-[var(--expense)] text-white hover:bg-[var(--expense)]/90"
            >
              {t("transactions.delete.confirmCta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TxRow({ tx, onDelete }: { tx: Tx; onDelete: () => void }) {
  const { t } = useTranslation();
  const isExpense = tx.type === "expense";
  const amount = isExpense ? -Math.abs(Number(tx.amount)) : Math.abs(Number(tx.amount));
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
          isExpense ? "bg-[var(--expense)]" : "bg-[#2A2A2A]"
        } text-white`}
      >
        {isExpense ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--foreground)]">{tx.label}</span>
          {tx.ai_categorized && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--gold)]">
              <Sparkles className="h-3 w-3" />
              {t("transactions.aiBadge")}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-[var(--muted-foreground)]">
          {[tx.category?.name, tx.account?.name].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div
        className={`shrink-0 text-right text-sm font-semibold ${
          isExpense ? "text-[var(--expense)]" : "text-[var(--success)]"
        }`}
      >
        {amount >= 0 ? "+" : "-"}
        {formatEUR(Math.abs(amount))}
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--expense)]/50 text-[var(--expense)] transition hover:bg-[var(--expense)]/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-7" />
        </svg>
      </div>
      <div className="mt-4 text-lg font-medium">{t("transactions.empty")}</div>
      <div className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">{t("transactions.emptyHint")}</div>
    </div>
  );
}

function AddTransactionSheet({
  open,
  onOpenChange,
  accounts,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Account[];
  categories: Category[];
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const categorize = useServerFn(aiCategorizeTransaction);

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setType("expense");
      setAmount("");
      setLabel("");
      setCategoryId(null);
      setAccountId(accounts[0]?.id ?? null);
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setNotesOpen(false);
    }
  }, [open, accounts]);

  const filteredCategories = categories.filter((c) => c.type === type || c.type === "both");

  async function handleSubmit() {
    if (!user) return;
    const amt = parseFloat(amount.replace(",", "."));
    if (!amt || !label.trim()) {
      toast.error(t("transactions.add.label"));
      return;
    }
    if (!accountId) {
      toast.error(t("transactions.add.noAccount"));
      return;
    }
    setSubmitting(true);

    let finalCategoryId = categoryId;
    let aiCategorized = false;
    if (!finalCategoryId) {
      try {
        const res = await categorize({ data: { label: label.trim(), type } });
        if (res?.categoryId) {
          finalCategoryId = res.categoryId;
          aiCategorized = true;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountId,
      category_id: finalCategoryId,
      amount: amt,
      label: label.trim(),
      type,
      date,
      notes: notes.trim() || null,
      ai_categorized: aiCategorized,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    // Update account balance
    const acct = accounts.find((a) => a.id === accountId);
    if (acct) {
      const delta = type === "income" ? amt : -amt;
      await supabase
        .from("accounts")
        .update({ balance: Number(acct.balance) + delta })
        .eq("id", accountId);
    }

    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["home-stats"] });
    setSubmitting(false);
    onOpenChange(false);
  }

  const accent = type === "expense" ? "var(--expense)" : "var(--success)";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto rounded-t-3xl border-t border-[var(--border)] bg-[var(--card)] p-0 sm:max-w-lg sm:mx-auto"
      >
        <SheetHeader className="sticky top-0 z-10 flex flex-row items-center justify-between border-b border-[var(--border)] bg-[var(--card)] p-4">
          <SheetTitle className="text-base">
            {type === "expense" ? t("transactions.add.titleExpense") : t("transactions.add.titleIncome")}
          </SheetTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="space-y-6 p-5">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-full bg-[var(--muted)] p-1">
            {(["expense", "income"] as TxType[]).map((tt) => (
              <button
                key={tt}
                onClick={() => {
                  setType(tt);
                  setCategoryId(null);
                }}
                className={`rounded-full py-2 text-sm font-medium transition ${
                  type === tt
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {t(`transactions.add.type.${tt}`)}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="text-center">
            <label className="label-caps">{t("transactions.add.amount")}</label>
            <div className="mt-2 flex items-baseline justify-center gap-2">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,00"
                className="w-40 bg-transparent text-center text-5xl font-light outline-none"
                style={{ color: accent }}
              />
              <span className="text-2xl text-[var(--muted-foreground)]">€</span>
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="label-caps">{t("transactions.add.label")}</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("transactions.add.labelPlaceholder")}
              className="mt-2 bg-[var(--muted)] border-0"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="label-caps">{t("transactions.add.category")}</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {filteredCategories.map((c) => {
                const active = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(active ? null : c.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition ${
                      active ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-[var(--border)] bg-[var(--muted)]"
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 place-items-center rounded-full text-base"
                      style={{ backgroundColor: c.color ?? "var(--muted)" }}
                    >
                      <span className="text-white text-xs font-semibold">{c.name.slice(0, 1)}</span>
                    </span>
                    <span className="line-clamp-2 text-[10px] text-[var(--foreground)]">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="label-caps">{t("transactions.add.account")}</label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {accounts.map((a) => {
                const active = accountId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAccountId(a.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                      active
                        ? "bg-[var(--foreground)] text-[var(--background)]"
                        : "border border-[var(--border)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {a.name}
                  </button>
                );
              })}
              {accounts.length === 0 && (
                <span className="text-xs text-[var(--muted-foreground)]">{t("transactions.add.noAccount")}</span>
              )}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="label-caps">{t("transactions.add.date")}</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 bg-[var(--muted)] border-0"
            />
          </div>

          {/* Notes */}
          <div>
            {!notesOpen ? (
              <button
                onClick={() => setNotesOpen(true)}
                className="text-sm text-[var(--gold)]"
              >
                + {t("transactions.add.addNote")}
              </button>
            ) : (
              <>
                <label className="label-caps">{t("transactions.add.notes")}</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 bg-[var(--muted)] border-0"
                  rows={3}
                />
              </>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-[var(--gold)] py-6 text-base font-semibold text-[var(--background)] hover:bg-[var(--gold)]/90"
          >
            {t("transactions.add.submit")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function groupByDate(txs: Tx[]) {
  const map = new Map<string, Tx[]>();
  for (const tx of txs) {
    const arr = map.get(tx.date) ?? [];
    arr.push(tx);
    map.set(tx.date, arr);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function formatDateHeader(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d
    .toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();
}
