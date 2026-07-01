import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/strings";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Target,
  RefreshCw,
  Trash2,
  ChevronDown,
  Lock,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { demoAssets, demoGoals, type DemoAsset, type DemoGoal } from "@/data/demo";
import { formatEUR } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { PaywallModal } from "@/components/paywall-modal";
import { getQuotes, searchSymbols } from "@/lib/quotes.functions";
import { AssetSearch, type SearchResult } from "@/components/asset-search";
import { AssetDetailModal } from "@/components/asset-detail-modal";

type AssetType = "Action" | "ETF" | "Crypto" | "Autre";
type Asset = {
  id: string;
  type: AssetType;
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  currency: string;
  created_at?: string;
};
type Goal = {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

export const Route = createFileRoute("/_authenticated/bourse")({
  component: BoursePage,
});

const TICKER_PALETTE = ["#2F3A4A", "#3B3F2E", "#4A2F35", "#2E3F3C", "#4A3A2F", "#3A2E4A"];
function tickerColor(sym: string): string {
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) >>> 0;
  return TICKER_PALETTE[h % TICKER_PALETTE.length];
}

function BoursePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const qc = useQueryClient();
  const fetchQuotes = useServerFn(getQuotes);

  const [addOpen, setAddOpen] = useState<null | "asset" | "goal">(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "asset" | "goal"; id: string }
    | null
  >(null);
  const [detail, setDetail] = useState<null | { symbol: string; name: string; currency?: string }>(null);
  const [prefill, setPrefill] = useState<null | { symbol: string; name: string }>(null);

  // assets
  const assetsQuery = useQuery({
    queryKey: ["assets", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async (): Promise<Asset[]> => {
      if (isDemo) return demoAssets as Asset[];
      const { data, error } = await supabase
        .from("assets")
        .select("id,type,symbol,name,quantity,purchase_price,current_price,currency,created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id,
        type: ((a as { type?: string }).type ?? "ETF") as AssetType,
        symbol: a.symbol,
        name: a.name,
        quantity: Number(a.quantity),
        purchase_price: Number(a.purchase_price),
        current_price: Number((a as { current_price?: number }).current_price ?? 0),
        currency: a.currency,
        created_at: a.created_at,
      }));
    },
  });

  // goals
  const goalsQuery = useQuery({
    queryKey: ["goals", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async (): Promise<Goal[]> => {
      if (isDemo) return demoGoals as Goal[];
      const { data, error } = await supabase
        .from("savings_goals")
        .select("id,name,icon,target_amount,current_amount,target_date")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon ?? "🎯",
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount ?? 0),
        target_date: g.target_date,
      }));
    },
  });

  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // Live quotes
  const symbols = useMemo(() => (assetsQuery.data ?? []).map((a) => a.symbol), [assetsQuery.data]);
  const symbolsKey = symbols.join(",");

  async function refreshPrices() {
    if (isDemo || symbols.length === 0) {
      setFetchedAt(new Date().toISOString());
      return;
    }
    try {
      const res = await fetchQuotes({ data: { symbols } });
      const map = res?.quotes ?? {};
      // persist current_price
      await Promise.all(
        (assetsQuery.data ?? []).map((a) => {
          const price = map[a.symbol];
          if (!price || price <= 0) return Promise.resolve();
          return supabase
            .from("assets")
            .update({ current_price: price, price_updated_at: new Date().toISOString() })
            .eq("id", a.id);
        }),
      );
      setFetchedAt(res?.fetchedAt ?? new Date().toISOString());
      qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (isDemo) {
      setFetchedAt(new Date().toISOString());
      return;
    }
    if (symbolsKey) refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, isDemo]);

  // Portfolio totals
  const totals = useMemo(() => {
    const list = assetsQuery.data ?? [];
    let value = 0;
    let invested = 0;
    list.forEach((a) => {
      value += a.current_price * a.quantity;
      invested += a.purchase_price * a.quantity;
    });
    const pnl = value - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { value, invested, pnl, pct };
  }, [assetsQuery.data]);

  const deleteMut = useMutation({
    mutationFn: async (target: { kind: "asset" | "goal"; id: string }) => {
      if (isDemo) {
        toast.info(t("demo.writeBlocked"));
        return;
      }
      const table = target.kind === "asset" ? "assets" : "savings_goals";
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", target.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [v.kind === "asset" ? "assets" : "goals"] });
    },
  });

  const inPortfolio = (sym: string) => (assetsQuery.data ?? []).some((a) => a.symbol.toUpperCase() === sym.toUpperCase());
  const positionOf = (sym: string) => {
    const a = (assetsQuery.data ?? []).find((x) => x.symbol.toUpperCase() === sym.toUpperCase());
    return a ? { quantity: a.quantity, purchase_price: a.purchase_price } : null;
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-24">
      <h1 className="text-4xl font-semibold tracking-tight mb-6">{t("stocks.title")}</h1>

      <div className="mb-5">
        <AssetSearch
          onPick={(r: SearchResult) => setDetail({ symbol: r.symbol, name: r.name })}
        />
      </div>


      {/* Portfolio header */}
      <div className="card-surface p-5 mb-6">
        <div className="label-caps">{t("stocks.portfolioValue")}</div>
        <div className="mt-1 text-4xl font-semibold tabular-nums">{formatEUR(totals.value)}</div>
        <div
          className={`mt-1 text-sm tabular-nums ${totals.pnl >= 0 ? "text-[#6BAF7A]" : "text-[#D4745A]"}`}
        >
          {totals.pnl >= 0 ? "+" : ""}
          {formatEUR(totals.pnl)} ({totals.pct >= 0 ? "+" : ""}
          {totals.pct.toFixed(2)}%)
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            {t("stocks.realtime")}
            {fetchedAt && ` · ${t("stocks.lastUpdated")} ${new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </span>
          <button
            onClick={refreshPrices}
            className="rounded-full border border-[var(--foreground)]/15 px-2.5 py-1 hover:bg-[var(--foreground)]/5"
            aria-label={t("stocks.refresh")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Section
        title={t("stocks.portfolio")}
        addLabel={t("stocks.addAsset")}
        onAdd={() => setAddOpen("asset")}
      >
        {assetsQuery.data && assetsQuery.data.length > 0 ? (
          <div className="space-y-2">
            {assetsQuery.data.map((a) => (
              <AssetRow
                key={a.id}
                asset={a}
                onDelete={() => setPendingDelete({ kind: "asset", id: a.id })}
                onOpen={() => setDetail({ symbol: a.symbol, name: a.name, currency: a.currency })}
              />
            ))}
          </div>
        ) : (
          <Empty icon={<LineChart className="h-6 w-6" />} text={t("stocks.emptyPortfolio")} />
        )}
      </Section>

      <Section
        title={t("stocks.goals")}
        addLabel={t("stocks.addGoal")}
        onAdd={() => setAddOpen("goal")}
      >
        {goalsQuery.data && goalsQuery.data.length > 0 ? (
          <div className="space-y-3">
            {goalsQuery.data.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onDelete={() => setPendingDelete({ kind: "goal", id: g.id })}
                onChanged={() => qc.invalidateQueries({ queryKey: ["goals"] })}
              />
            ))}
          </div>
        ) : (
          <Empty icon={<Target className="h-6 w-6" />} text={t("stocks.emptyGoals")} />
        )}
      </Section>

      {addOpen === "asset" && (
        <AddAssetSheet
          open
          onClose={() => setAddOpen(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["assets"] });
            setTimeout(refreshPrices, 200);
          }}
        />
      )}
      {addOpen === "goal" && (
        <AddGoalSheet
          open
          onClose={() => setAddOpen(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["goals"] })}
        />
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "asset"
                ? t("stocks.deleteAssetConfirm")
                : t("stocks.deleteGoalConfirm")}
            </AlertDialogTitle>
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

// ============ Building blocks ============

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
        <button onClick={onAdd} className="text-sm font-medium text-[#C8B99A] hover:opacity-80">
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

function AssetRow({ asset, onDelete }: { asset: Asset; onDelete: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const value = asset.current_price * asset.quantity;
  const invested = asset.purchase_price * asset.quantity;
  const pnl = value - invested;
  const positive = pnl >= 0;
  return (
    <div className="card-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: tickerColor(asset.symbol) }}
        >
          {asset.symbol.slice(0, 4)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{asset.name}</div>
          <div className="text-xs text-[var(--muted-foreground)] tabular-nums">
            {asset.quantity} × {formatEUR(asset.current_price)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums">{formatEUR(value)}</div>
          <div className={`text-xs tabular-nums ${positive ? "text-[#6BAF7A]" : "text-[#D4745A]"}`}>
            {positive ? "+" : ""}
            {formatEUR(pnl)}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-[var(--foreground)]/10 px-4 py-3 text-xs text-[var(--muted-foreground)] space-y-1">
          <div className="flex justify-between">
            <span>{t("stocks.purchasePrice")}</span>
            <span className="tabular-nums text-[var(--foreground)]">{formatEUR(asset.purchase_price)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("stocks.totalInvested")}</span>
            <span className="tabular-nums text-[var(--foreground)]">{formatEUR(invested)}</span>
          </div>
          {asset.created_at && (
            <div className="flex justify-between">
              <span>{t("stocks.dateAdded")}</span>
              <span className="text-[var(--foreground)]">
                {new Date(asset.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="pt-2 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="grid h-8 w-8 place-items-center rounded-full border border-[#D4745A]/40 text-[#D4745A] hover:bg-[#D4745A]/10"
              aria-label={t("accounts.delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onDelete,
  onChanged,
}: {
  goal: Goal;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const { isDemo } = useDemo();
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
  const reached = goal.current_amount >= goal.target_amount;
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);

  async function addFunds() {
    const n = Number(amt);
    if (!n || n <= 0) return;
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      setAmt("");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("savings_goals")
      .update({ current_amount: goal.current_amount + n })
      .eq("id", goal.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAmt("");
    onChanged();
  }

  return (
    <div className="card-surface p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--foreground)]/10 text-xl">
          {goal.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold truncate">{goal.name}</span>
            <span className="text-sm tabular-nums">
              {formatEUR(goal.current_amount)} / {formatEUR(goal.target_amount)}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--foreground)]/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: reached ? "#6BAF7A" : "#C8B99A" }}
            />
          </div>
          <div className="mt-1.5 text-xs text-[var(--muted-foreground)]">
            {reached ? (
              <span className="text-[#6BAF7A]">{t("stocks.goalReached")}</span>
            ) : (
              <>
                {formatEUR(remaining)} {t("stocks.goalRemaining")}
                {goal.target_date &&
                  ` · ${t("stocks.goalDue")}: ${new Date(goal.target_date).toLocaleDateString()}`}
              </>
            )}
          </div>
        </div>
      </button>
      {open && (
        <div className="mt-3 border-t border-[var(--foreground)]/10 pt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            className="h-9"
          />
          <Button size="sm" onClick={addFunds} disabled={busy || !amt}>
            {t("stocks.addFunds")}
          </Button>
          <button
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#D4745A]/40 text-[#D4745A] hover:bg-[#D4745A]/10"
            aria-label={t("accounts.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============ Sheets ============

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
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        active
          ? "bg-[var(--foreground)] text-[var(--background)] border-transparent"
          : "border-[var(--foreground)]/20 text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
      }`}
    >
      {children}
    </button>
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

function AddAssetSheet({
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
  const search = useServerFn(searchSymbols);
  const [type, setType] = useState<AssetType>("Action");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);

  useEffect(() => {
    if (isDemo || symbol.length < 1) {
      setSuggestions([]);
      return;
    }
    const q = symbol;
    const id = setTimeout(async () => {
      try {
        const res = await search({ data: { query: q } });
        setSuggestions(res?.results ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [symbol, isDemo, search]);

  const types: { v: AssetType; label: string }[] = [
    { v: "Action", label: t("stocks.typeStock") },
    { v: "ETF", label: t("stocks.typeETF") },
    { v: "Crypto", label: t("stocks.typeCrypto") },
    { v: "Autre", label: t("stocks.typeOther") },
  ];

  async function submit() {
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      onClose();
      return;
    }
    if (!user || !symbol.trim() || !name.trim() || !quantity || !price) return;
    setSaving(true);
    const { error } = await supabase.from("assets").insert({
      user_id: user.id,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      quantity: Number(quantity),
      purchase_price: Number(price),
      currency,
      type,
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
      <FormShell open={open} onClose={onClose} title={t("stocks.addAsset")}>
        <Field label={t("stocks.assetType")}>
          <div className="flex flex-wrap gap-2">
            {types.map((tp) => (
              <Pill key={tp.v} active={type === tp.v} onClick={() => setType(tp.v)}>
                {tp.label}
              </Pill>
            ))}
          </div>
        </Field>
        <Field label={t("stocks.ticker")}>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
            autoFocus
          />
          {suggestions.length > 0 && (
            <div className="mt-1 rounded-lg border border-[var(--foreground)]/15 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={`${s.symbol}-${s.name}`}
                  onClick={() => {
                    setSymbol(s.symbol);
                    setName(s.name);
                    setSuggestions([]);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-[var(--foreground)]/5"
                >
                  <span className="font-semibold">{s.symbol}</span>{" "}
                  <span className="text-[var(--muted-foreground)]">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field label={t("stocks.assetName")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("stocks.quantity")}>
            <Input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label={t("stocks.purchasePrice")}>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                €
              </span>
            </div>
          </Field>
        </div>
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
        <Button
          onClick={submit}
          disabled={saving || !symbol.trim() || !name.trim() || !quantity || !price}
          className="w-full"
        >
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

const GOAL_ICONS = ["🎯", "🏠", "✈️", "🚗", "💍", "📱", "🎓", "💰", "🏖️", "🛒"];

function AddGoalSheet({
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
  const [icon, setIcon] = useState("🎯");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (isDemo) {
      toast.info(t("demo.writeBlocked"));
      onClose();
      return;
    }
    if (!user || !name.trim() || !target) return;
    setSaving(true);
    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      name: name.trim(),
      icon,
      target_amount: Number(target),
      current_amount: Number(current || 0),
      target_date: date || null,
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
    <FormShell open={open} onClose={onClose} title={t("stocks.addGoal")}>
      <Field label={t("stocks.goalIcon")}>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              className={`grid h-10 w-10 place-items-center rounded-full border text-xl transition ${
                icon === e
                  ? "border-[#C8B99A] bg-[#C8B99A]/10"
                  : "border-[var(--foreground)]/15"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("stocks.goalName")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("stocks.targetAmount")}>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">€</span>
          </div>
        </Field>
        <Field label={t("stocks.currentAmount")}>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">€</span>
          </div>
        </Field>
      </div>
      <Field label={t("stocks.goalDate")}>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Button onClick={submit} disabled={saving || !name.trim() || !target} className="w-full">
        {t("accounts.save")}
      </Button>
    </FormShell>
  );
}
