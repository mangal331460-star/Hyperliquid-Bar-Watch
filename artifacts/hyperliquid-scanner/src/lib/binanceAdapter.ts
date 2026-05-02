
import { ExchangeAdapter, NormalizedCandle } from "./exchanges";

// Using Binance's public data mirror — no geo-restrictions unlike api.binance.com
const BASE = "https://data-api.binance.vision/api/v3";

// Leverage tokens and non-standard suffixes to exclude
const EXCLUDE = ["DOWNUSDT", "UPUSDT", "BULLUSDT", "BEARUSDT", "HEDGEUSDT"];

async function fetchWithTimeout(url: string, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export const binanceAdapter: ExchangeAdapter = {
  id: "binance",
  name: "Binance",
  color: "#f0b90b",

  async fetchAssets(): Promise<string[]> {
    // Use ticker/price — much lighter than exchangeInfo (~50KB vs ~3MB)
    const res = await fetchWithTimeout(`${BASE}/ticker/price`);
    if (!res.ok) throw new Error(`Binance ticker/price ${res.status}`);
    const data: { symbol: string }[] = await res.json();
    return data
      .map((t) => t.symbol)
      .filter(
        (s) => s.endsWith("USDT") && !EXCLUDE.some((ex) => s.endsWith(ex))
      );
  },

  async fetchRecentCandles(symbol: string, count = 5): Promise<NormalizedCandle[]> {
    const res = await fetchWithTimeout(
      `${BASE}/klines?symbol=${symbol}&interval=5m&limit=${count + 2}`
    );
    if (!res.ok) throw new Error(`Binance klines ${res.status}`);
    const raw: [number, string, string, string, string, string, number, ...unknown[]][] =
      await res.json();
    const now = Date.now();
    const completed = raw.filter(([, , , , , , closeTime]) => closeTime < now - 10_000);
    return completed.slice(-count).map(([openTime, open, high, low, close, volume, closeTime]) => ({
      openTime,
      closeTime,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }));
  },

  getTVSymbol(symbol: string): string {
    return `BINANCE:${symbol}`;
  },

  getBaseCoin(symbol: string): string {
    // BTCUSDT → BTC
    return symbol.replace(/USDT$/, "").toUpperCase();
  },
};
