import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

type CacheClient = {
  from: (table: string) => {
    // minimal typing; the real client is supabase-js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (...args: unknown[]) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsert: (...args: unknown[]) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: (...args: unknown[]) => any;
  };
};

type CacheHit<T> = { hit: true; data: T; ageMinutes: number };
type CacheMiss = { hit: false };

async function readCache<T>(
  supabase: CacheClient,
  key: string,
): Promise<CacheHit<T> | CacheMiss> {
  const { data } = await supabase
    .from("price_cache")
    .select("data, fetched_at")
    .eq("symbol", key)
    .maybeSingle();
  if (!data) return { hit: false };
  const age = Date.now() - new Date(data.fetched_at as string).getTime();
  if (age > CACHE_TTL_MS) return { hit: false };
  return { hit: true, data: data.data as T, ageMinutes: Math.floor(age / 60000) };
}

async function writeCache(supabase: CacheClient, key: string, data: unknown) {
  await supabase
    .from("price_cache")
    .upsert(
      { symbol: key, data, fetched_at: new Date().toISOString() },
      { onConflict: "symbol" },
    );
}

async function deleteCache(supabase: CacheClient, key: string) {
  await supabase.from("price_cache").delete().eq("symbol", key);
}

// ============ QUOTES ============

type QuoteMap = Record<string, number>;

async function fetchPrice(symbol: string, apiKey: string): Promise<number> {
  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = (await res.json()) as { price?: string };
    return parseFloat(data?.price ?? "0") || 0;
  } catch {
    return 0;
  }
}

export const getQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbols: string[]; forceRefresh?: boolean }) => ({
    symbols: Array.isArray(input?.symbols)
      ? input.symbols.filter((s) => typeof s === "string" && s.length > 0)
      : [],
    forceRefresh: !!input?.forceRefresh,
  }))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    const supabase = context.supabase as unknown as CacheClient;
    const out: QuoteMap = {};
    let oldestAgeMinutes = 0;
    let anyMiss = false;

    if (data.symbols.length === 0) {
      return { quotes: out, fetchedAt: new Date().toISOString(), cache: "MISS" as const, ageMinutes: 0 };
    }

    await Promise.all(
      data.symbols.map(async (sym) => {
        const key = sym;
        if (data.forceRefresh) await deleteCache(supabase, key);
        const cached = data.forceRefresh
          ? ({ hit: false } as const)
          : await readCache<{ price: number }>(supabase, key);
        if (cached.hit) {
          out[sym] = cached.data.price;
          oldestAgeMinutes = Math.max(oldestAgeMinutes, cached.ageMinutes);
          return;
        }
        anyMiss = true;
        const price = apiKey ? await fetchPrice(sym, apiKey) : 0;
        out[sym] = price;
        if (price > 0) await writeCache(supabase, key, { price });
      }),
    );

    return {
      quotes: out,
      fetchedAt: new Date().toISOString(),
      cache: (anyMiss ? "MISS" : "HIT") as "HIT" | "MISS",
      ageMinutes: oldestAgeMinutes,
    };
  });

// ============ SEARCH ============

export const searchSymbols = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input?.query ?? "").trim() }))
  .handler(async ({ data, context }) => {
    const q = data.query.toLowerCase();
    if (q.length < 1) return { results: [] as Array<{ symbol: string; name: string; type?: string; exchange?: string; country?: string }> };
    const supabase = context.supabase as unknown as CacheClient;
    const key = `search_${q}`;
    const cached = await readCache<{ results: Array<{ symbol: string; name: string; type?: string; exchange?: string; country?: string }> }>(supabase, key);
    if (cached.hit) return cached.data;

    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) return { results: [] };
    try {
      const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(data.query)}&outputsize=6&apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return { results: [] };
      const json = (await res.json()) as { data?: Array<{ symbol: string; instrument_name: string; instrument_type?: string; exchange?: string; country?: string }> };
      const results = (json?.data ?? []).slice(0, 6).map((r) => ({
        symbol: r.symbol,
        name: r.instrument_name,
        type: r.instrument_type,
        exchange: r.exchange,
        country: r.country,
      }));
      const out = { results };
      await writeCache(supabase, key, out);
      return out;
    } catch {
      return { results: [] };
    }
  });

// ============ CHART DATA ============

const INTERVAL_MAP: Record<string, { interval: string; outputsize: number }> = {
  "1J": { interval: "5min", outputsize: 78 },
  "1S": { interval: "1h", outputsize: 40 },
  "1M": { interval: "1day", outputsize: 30 },
  "3M": { interval: "1day", outputsize: 90 },
  "1A": { interval: "1week", outputsize: 52 },
  Max: { interval: "1month", outputsize: 120 },
};

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartResponse = {
  symbol: string;
  period: string;
  candles: Candle[];
  meta?: { name?: string; currency?: string; exchange?: string };
  error?: string;
};

export const getChartData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbol: string; period: string; forceRefresh?: boolean }) => ({
    symbol: String(input?.symbol ?? "").trim().toUpperCase(),
    period: String(input?.period ?? "1M"),
    forceRefresh: !!input?.forceRefresh,
  }))
  .handler(async ({ data, context }): Promise<ChartResponse & { cache: "HIT" | "MISS"; ageMinutes: number }> => {
    if (!data.symbol) return { symbol: "", period: data.period, candles: [], cache: "MISS", ageMinutes: 0, error: "missing_symbol" };
    const supabase = context.supabase as unknown as CacheClient;
    const key = `${data.symbol}_${data.period}`;
    if (data.forceRefresh) await deleteCache(supabase, key);

    if (!data.forceRefresh) {
      const cached = await readCache<ChartResponse>(supabase, key);
      if (cached.hit) return { ...cached.data, cache: "HIT", ageMinutes: cached.ageMinutes };
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) return { symbol: data.symbol, period: data.period, candles: [], cache: "MISS", ageMinutes: 0, error: "missing_api_key" };
    const { interval, outputsize } = INTERVAL_MAP[data.period] ?? INTERVAL_MAP["1M"];
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(data.symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;
    try {
      const res = await fetch(url);
      const json = (await res.json()) as {
        status?: string;
        message?: string;
        values?: Array<Record<string, string>>;
        meta?: { symbol?: string; currency?: string; exchange?: string; instrument_name?: string };
      };
      if (json.status === "error") {
        return { symbol: data.symbol, period: data.period, candles: [], cache: "MISS", ageMinutes: 0, error: json.message ?? "api_error" };
      }
      const candles: Candle[] = (json.values ?? [])
        .slice()
        .reverse()
        .map((v) => ({
          time: v.datetime,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: parseFloat(v.volume ?? "0"),
        }));
      const result: ChartResponse = {
        symbol: data.symbol,
        period: data.period,
        candles,
        meta: {
          name: json.meta?.instrument_name,
          currency: json.meta?.currency,
          exchange: json.meta?.exchange,
        },
      };
      await writeCache(supabase, key, result);
      return { ...result, cache: "MISS", ageMinutes: 0 };
    } catch (e) {
      return { symbol: data.symbol, period: data.period, candles: [], cache: "MISS", ageMinutes: 0, error: String(e) };
    }
  });
