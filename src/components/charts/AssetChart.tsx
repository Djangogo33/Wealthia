import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  AreaSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

interface AssetChartProps {
  candles: Candle[];
  period: string;
  color?: string; // hex; overrides positive/negative auto
  height?: number;
}

function toUTC(t: string): UTCTimestamp {
  // Accepts "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss"
  const normalized = t.includes(" ") ? t.replace(" ", "T") + "Z" : t + "T00:00:00Z";
  return (Math.floor(new Date(normalized).getTime() / 1000) as unknown) as UTCTimestamp;
}

export function AssetChart({ candles, period, color, height = 260 }: AssetChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8A8A7A",
      },
      grid: {
        vertLines: { color: "#1E1E1E" },
        horzLines: { color: "#1E1E1E" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#2A2A2A" },
      timeScale: { borderColor: "#2A2A2A", timeVisible: period === "1J" || period === "1S" },
      width: el.clientWidth,
      height,
    });
    chartRef.current = chart;

    const useCandles = period === "1J" || period === "1S";
    if (useCandles) {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#6BAF7A",
        downColor: "#D4745A",
        borderVisible: false,
        wickUpColor: "#6BAF7A",
        wickDownColor: "#D4745A",
      });
      const seen = new Set<number>();
      const data = candles
        .map((c) => ({
          time: toUTC(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
        .filter((d) => {
          if (seen.has(d.time as unknown as number)) return false;
          seen.add(d.time as unknown as number);
          return true;
        })
        .sort((a, b) => (a.time as unknown as number) - (b.time as unknown as number));
      series.setData(data);
    } else {
      const first = candles[0]?.close ?? 0;
      const last = candles[candles.length - 1]?.close ?? 0;
      const auto = last >= first ? "#6BAF7A" : "#D4745A";
      const line = color ?? auto;
      const series = chart.addSeries(AreaSeries, {
        lineColor: line,
        topColor: `${line}55`,
        bottomColor: `${line}00`,
        lineWidth: 2,
      });
      const seen = new Set<number>();
      const data = candles
        .map((c) => ({ time: toUTC(c.time), value: c.close }))
        .filter((d) => {
          if (seen.has(d.time as unknown as number)) return false;
          seen.add(d.time as unknown as number);
          return true;
        })
        .sort((a, b) => (a.time as unknown as number) - (b.time as unknown as number));
      series.setData(data);
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, period, color, height]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
