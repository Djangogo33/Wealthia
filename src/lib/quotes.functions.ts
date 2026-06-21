import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .inputValidator((input: { symbols: string[] }) => ({
    symbols: Array.isArray(input?.symbols) ? input.symbols.filter((s) => typeof s === "string" && s.length > 0) : [],
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    const out: QuoteMap = {};
    if (!apiKey || data.symbols.length === 0) {
      data.symbols.forEach((s) => (out[s] = 0));
      return { quotes: out, fetchedAt: new Date().toISOString() };
    }
    // batch single requests in parallel for stability across regions
    const prices = await Promise.all(data.symbols.map((s) => fetchPrice(s, apiKey)));
    data.symbols.forEach((s, i) => (out[s] = prices[i]));
    return { quotes: out, fetchedAt: new Date().toISOString() };
  });

export const searchSymbols = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input?.query ?? "").trim() }))
  .handler(async ({ data }) => {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey || data.query.length < 1) return { results: [] as Array<{ symbol: string; name: string }> };
    try {
      const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(data.query)}&outputsize=5&apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return { results: [] };
      const json = (await res.json()) as { data?: Array<{ symbol: string; instrument_name: string }> };
      return {
        results: (json?.data ?? []).slice(0, 5).map((r) => ({ symbol: r.symbol, name: r.instrument_name })),
      };
    } catch {
      return { results: [] };
    }
  });
