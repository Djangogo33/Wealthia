import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/strings";
import { useDemo } from "@/hooks/use-demo";
import { AssetChart, type Candle } from "@/components/charts/AssetChart";
import { getChartData, getQuotes } from "@/lib/quotes.functions";
import { formatEUR } from "@/lib/format";

type Period = "1J" | "1S" | "1M" | "3M" | "1A" | "Max";
const PERIODS: Period[] = ["1J", "1S", "1M", "3M", "1A", "Max"];

const COOLDOWN_MS = 5 * 60 * 1000;

export type PortfolioPosition = {
  quantity: number;
  purchase_price: number;
};

export type AssetDetailProps = {
  open: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  currency?: string;
  position?: PortfolioPosition | null;
  inPortfolio: boolean;
  onAddToPortfolio: () => void;
};

function generateDemoCandles(basePrice: number, count: number, period: Period): Candle[] {
  const dayMs = 86_400_000;
  const stepMs =
    period === "1J" ? 5 * 60 * 1000 :
    period === "1S" ? 60 * 60 * 1000 :
    period === "1M" || period === "3M" ? dayMs :
    period === "1A" ? 7 * dayMs :
    30 * dayMs;
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const noise = (Math.sin(i * 0.3) + Math.random() * 0.4 - 0.2) * basePrice * 0.03;
    const close = basePrice + noise + (i / count) * basePrice * 0.02;
    const ts = new Date(now - (count - i) * stepMs);
    const time =
      period === "1J" || period === "1S"
        ? ts.toISOString().replace("T", " ").slice(0, 19)
        : ts.toISOString().slice(0, 10);
    return {
      time,
      open: close - Math.random() * basePrice * 0.01,
      high: close + Math.random() * basePrice * 0.015,
      low: close - Math.random() * basePrice * 0.015,
      close,
      volume: Math.floor(Math.random() * 10_000_000),
    };
  });
}

function useCooldown() {
  const [until, setUntil] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [until, tick]);
  const remainingMs = Math.max(0, until - Date.now());
  return {
    active: remainingMs > 0,
    remainingMs,
    trigger: () => setUntil(Date.now() + COOLDOWN_MS),
  };
}

function formatMMSS(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatAge(min: number, t: (k: string) => string) {
  if (min < 1) return `${t("stocks.lastUpdated")} < 1min`;
  if (min < 60) return `${t("stocks.lastUpdated")} ${min}min`;
  const h = Math.floor(min / 60);
  return `${t("stocks.lastUpdated")} ${h}h`;
}

export function AssetDetailModal({
  open,
  onClose,
  symbol,
  name,
  currency,
  position,
  inPortfolio,
  onAddToPortfolio,
}: AssetDetailProps) {
  const { t } = useTranslation();
  const { isDemo } = useDemo();
  const fetchChart = useServerFn(getChartData);
  const fetchQuotes = useServerFn(getQuotes);

  const [period, setPeriod] = useState<Period>("1M");
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageMin, setAgeMin] = useState<number>(0);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const cooldown = useCooldown();
  const requestRef = useRef(0);

  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";

  async function load(force = false) {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    const reqId = ++requestRef.current;

    try {
      if (isDemo) {
        const base = livePrice ?? 100;
        const count = period === "1J" ? 78 : period === "1S" ? 40 : period === "1M" ? 30 : period === "3M" ? 90 : period === "1A" ? 52 : 120;
        const demoC = generateDemoCandles(base, count, period);
        if (reqId === requestRef.current) {
          setCandles(demoC);
          setAgeMin(-1); // sentinel for demo
          setLoading(false);
        }
        return;
      }

      const [chart, quotes] = await Promise.all([
        fetchChart({ data: { symbol, period, forceRefresh: force } }),
        livePrice == null || force
          ? fetchQuotes({ data: { symbols: [symbol], forceRefresh: force } })
          : Promise.resolve(null),
      ]);

      if (reqId !== requestRef.current) return;

      if (chart.error) setError(chart.error);
      setCandles(chart.candles);
      setAgeMin(chart.ageMinutes);

      if (quotes) {
        const p = quotes.quotes?.[symbol];
        if (p) setLivePrice(p);
      }
    } catch (e) {
      if (reqId === requestRef.current) setError(String(e));
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }

  // Reset & load when opening/changing symbol
  useEffect(() => {
    if (!open) return;
    setCandles(null);
    setLivePrice(null);
    setPeriod("1M");
  }, [open, symbol]);

  useEffect(() => {
    if (!open) return;
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbol, period, isDemo]);

  function onRefresh() {
    if (cooldown.active) return;
    cooldown.trigger();
    load(true);
  }

  const stats = useMemo(() => {
    if (!candles || candles.length === 0) return null;
    const last = candles[candles.length - 1];
    const first = candles[0];
    const yearChange = first.close > 0 ? ((last.close - first.close) / first.close) * 100 : 0;
    return {
      open: last.open,
      close: last.close,
      high: last.high,
      low: last.low,
      volume: last.volume ?? 0,
      yearChange,
    };
  }, [candles]);

  const currentPrice = livePrice ?? stats?.close ?? 0;
  const prevClose = candles && candles.length >= 2 ? candles[candles.length - 2].close : stats?.open ?? currentPrice;
  const dayChange = currentPrice - prevClose;
  const dayPct = prevClose > 0 ? (dayChange / prevClose) * 100 : 0;
  const positive = dayChange >= 0;

  const posValue = position ? position.quantity * currentPrice : 0;
  const posInvested = position ? position.quantity * position.purchase_price : 0;
  const posPnl = posValue - posInvested;
  const posPct = posInvested > 0 ? (posPnl / posInvested) * 100 : 0;

  function fmt(v: number) {
    return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol}`;
  }
  function fmtVol(v: number) {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return String(Math.floor(v));
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl h-[100dvh] sm:h-[90vh] sm:max-w-2xl sm:mx-auto overflow-y-auto p-0"
      >
        <SheetHeader className="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--foreground)]/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--foreground)]/5"
            >
              <X className="h-5 w-5" />
            </button>
            <SheetTitle className="flex-1 text-left">
              <div className="text-base font-semibold truncate">
                {symbol} · <span className="text-[var(--muted-foreground)] font-normal">{name}</span>
              </div>
            </SheetTitle>
            {inPortfolio ? (
              <span className="text-xs rounded-full border border-[#C8B99A] px-3 py-1.5 text-[#C8B99A]">
                {t("stocks.alreadyInPortfolio")}
              </span>
            ) : (
              <Button size="sm" onClick={onAddToPortfolio}>
                {t("stocks.addToPortfolio")}
              </Button>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2 pl-11 text-left">
            <span className="text-2xl font-semibold tabular-nums">{fmt(currentPrice)}</span>
            <span
              className={`text-sm tabular-nums ${positive ? "text-[#6BAF7A]" : "text-[#D4745A]"}`}
            >
              {positive ? "+" : ""}
              {dayChange.toFixed(2)} ({positive ? "+" : ""}
              {dayPct.toFixed(2)}%) {t("stocks.todayChange")}
            </span>
          </div>
        </SheetHeader>

        <div className="px-4 py-4 space-y-4">
          {/* Period pills */}
          <div className="flex gap-2 overflow-x-auto">
            {PERIODS.map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition shrink-0 ${
                    active
                      ? "bg-[var(--foreground)] text-[var(--background)] border-transparent"
                      : "border-[var(--foreground)]/20 text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
                  }`}
                >
                  {t(`stocks.periods.${p}`)}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div className="card-surface p-3 min-h-[280px] flex items-center justify-center">
            {loading && !candles ? (
              <div className="h-[260px] w-full animate-pulse rounded-lg bg-[var(--foreground)]/5" />
            ) : error && (!candles || candles.length === 0) ? (
              <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                {t("stocks.chartUnavailable")}
              </div>
            ) : candles && candles.length > 0 ? (
              <div className="w-full">
                <AssetChart candles={candles} period={period} />
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                {t("stocks.chartUnavailable")}
              </div>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="card-surface p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <StatRow label={t("stocks.openPrice")} value={fmt(stats.open)} />
              <StatRow label={t("stocks.highPrice")} value={fmt(stats.high)} />
              <StatRow label={t("stocks.closePrice")} value={fmt(stats.close)} />
              <StatRow label={t("stocks.lowPrice")} value={fmt(stats.low)} />
              <StatRow label={t("stocks.volume")} value={fmtVol(stats.volume)} />
              <StatRow
                label={t("stocks.yearChange")}
                value={`${stats.yearChange >= 0 ? "+" : ""}${stats.yearChange.toFixed(1)}%`}
                tone={stats.yearChange >= 0 ? "pos" : "neg"}
              />
            </div>
          )}

          {/* Cache + refresh */}
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3" />
              {isDemo || ageMin < 0 ? t("demo.banner") : formatAge(ageMin, t)}
            </span>
            <button
              onClick={onRefresh}
              disabled={cooldown.active || loading || isDemo}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--foreground)]/15 px-3 py-1 hover:bg-[var(--foreground)]/5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {cooldown.active
                ? `${t("stocks.refreshCooldown")} ${formatMMSS(cooldown.remainingMs)}`
                : t("stocks.refresh")}
            </button>
          </div>

          {/* My Position */}
          {position && (
            <div className="card-surface p-4">
              <div className="label-caps mb-2">{t("stocks.myPosition")}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <StatRow label={t("stocks.quantity")} value={String(position.quantity)} />
                <StatRow label={t("stocks.purchasePrice")} value={fmt(position.purchase_price)} />
                <StatRow label={t("stocks.currentPrice")} value={formatEUR(posValue)} />
                <StatRow
                  label={t("stocks.latentGain")}
                  value={`${posPnl >= 0 ? "+" : ""}${formatEUR(posPnl)} (${posPct >= 0 ? "+" : ""}${posPct.toFixed(2)}%)`}
                  tone={posPnl >= 0 ? "pos" : "neg"}
                />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatRow({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span
        className={`tabular-nums font-medium ${
          tone === "pos" ? "text-[#6BAF7A]" : tone === "neg" ? "text-[#D4745A]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
