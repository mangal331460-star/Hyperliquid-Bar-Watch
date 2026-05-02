
import { ExchangeAdapter, NormalizedCandle } from "./exchanges";

const BASE = "https://api.binance.com/api/v3";

export const binanceAdapter: ExchangeAdapter = {
  id: "binance",
  name: "Binance",
  color: "#f0b90b",

  async fetchAssets(): Promise<string[]> {
    const res = await fetch(`${BASE}/exchangeInfo`);
    if (!res.ok) throw new Error(`Binance exchangeInfo ${res.status}`);
    const data = await res.json();
    return (data.symbols as { symbol: string; status: string; quoteAsset: string }[])
      .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
      .map((s) => s.symbol);
  },

  async fetchRecentCandles(symbol: string, count = 5): Promise<NormalizedCandle[]> {
    const limit = count + 2;
    const res = await fetch(
      `${BASE}/klines?symbol=${symbol}&interval=5m&limit=${limit}`
    );
    if (!res.ok) throw new Error(`Binance klines ${res.status}`);
    const raw: [number, string, string, string, string, string, number, ...unknown[]][] = await res.json();
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
};
