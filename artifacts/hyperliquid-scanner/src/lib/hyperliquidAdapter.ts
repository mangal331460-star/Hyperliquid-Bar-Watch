
import { ExchangeAdapter, NormalizedCandle } from "./exchanges";

const API = "https://api.hyperliquid.xyz/info";

async function post(body: object) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API ${res.status}`);
  return res.json();
}

export const hyperliquidAdapter: ExchangeAdapter = {
  id: "hyperliquid",
  name: "Hyperliquid",
  color: "#34d399",

  async fetchAssets(): Promise<string[]> {
    const data = await post({ type: "meta" });
    return (data.universe as { name: string }[]).map((u) => u.name);
  },

  async fetchRecentCandles(symbol: string, count = 5): Promise<NormalizedCandle[]> {
    const now = Date.now();
    const fiveMin = 5 * 60 * 1000;
    const startTime = now - fiveMin * (count + 2);
    const data = await post({
      type: "candleSnapshot",
      req: { coin: symbol, interval: "5m", startTime, endTime: now },
    });
    const raw = data as { t: number; T: number; o: string; h: string; l: string; c: string; v: string }[];
    const completed = raw.filter((c) => c.T < now - 10_000);
    return completed.slice(-count).map((c) => ({
      openTime: c.t,
      closeTime: c.T,
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
      volume: parseFloat(c.v),
    }));
  },

  getTVSymbol(symbol: string): string {
    return `BINANCE:${symbol}USDT.P`;
  },
};
