import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { searchSymbols } from "@/lib/quotes.functions";
import { useDemo } from "@/hooks/use-demo";
import { useTranslation } from "@/lib/strings";

export type SearchResult = {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  country?: string;
};

const DEMO_RESULTS: SearchResult[] = [
  { symbol: "AAPL", name: "Apple Inc.", type: "Common Stock", exchange: "NASDAQ", country: "United States" },
  { symbol: "BTC", name: "Bitcoin", type: "Digital Currency", exchange: "Binance", country: "" },
  { symbol: "MC", name: "LVMH Moet Hennessy Louis Vuitton", type: "Common Stock", exchange: "Euronext", country: "France" },
];

const COUNTRY_FLAG: Record<string, string> = {
  "United States": "🇺🇸",
  France: "🇫🇷",
  Germany: "🇩🇪",
  "United Kingdom": "🇬🇧",
  Japan: "🇯🇵",
  Switzerland: "🇨🇭",
  Netherlands: "🇳🇱",
  Canada: "🇨🇦",
};

export function AssetSearch({ onPick }: { onPick: (r: SearchResult) => void }) {
  const { t } = useTranslation();
  const { isDemo } = useDemo();
  const search = useServerFn(searchSymbols);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      const reqId = ++reqRef.current;
      setLoading(true);
      try {
        if (isDemo) {
          const filtered = DEMO_RESULTS.filter(
            (r) =>
              r.symbol.toLowerCase().includes(q.toLowerCase()) ||
              r.name.toLowerCase().includes(q.toLowerCase()),
          );
          if (reqId === reqRef.current) setResults(filtered.length ? filtered : DEMO_RESULTS);
        } else {
          const res = await search({ data: { query: q } });
          if (reqId === reqRef.current) setResults(res.results ?? []);
        }
      } catch {
        if (reqId === reqRef.current) setResults([]);
      } finally {
        if (reqId === reqRef.current) setLoading(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [q, isDemo, search]);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOut);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-[var(--foreground)]/15 bg-[var(--card)] px-4 py-2.5">
        <Search className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("stocks.search")}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--muted-foreground)]"
        />
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
        ) : q ? (
          <button
            onClick={() => {
              setQ("");
              setResults([]);
            }}
            aria-label="Clear"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {open && q.trim() && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-[var(--foreground)]/15 bg-[var(--card)] shadow-lg overflow-hidden">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-4 text-sm text-[var(--muted-foreground)]">{t("stocks.noResults")}</div>
          ) : (
            results.map((r) => (
              <button
                key={`${r.symbol}-${r.exchange}-${r.name}`}
                type="button"
                onClick={() => {
                  onPick(r);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--foreground)]/5"
              >
                <span className="inline-grid h-9 min-w-[3.5rem] px-2 place-items-center rounded-md bg-[var(--foreground)]/10 text-xs font-semibold">
                  {r.symbol}
                </span>
                <span className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)] truncate">
                    {[r.type, r.exchange].filter(Boolean).join(" · ")}
                    {r.country ? ` ${COUNTRY_FLAG[r.country] ?? ""}` : ""}
                  </div>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
