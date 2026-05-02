
import { ExchangeAdapter, NormalizedCandle } from "./exchanges";

const BASE = "https://api.kucoin.com/api/v1";

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

export const kucoinAdapter: ExchangeAdapter = {
  id: "kucoin",
  name: "KuCoin",
  color: "#00c8a0",

  async fetchAssets(): Promise<string[]> {
    const res = await fetchWithTimeout(`${BASE}/symbols`);
    if (!res.ok) throw new Error(`KuCoin symbols ${res.status}`);
    const data = await res.json();
    if (data.code !== "200000") throw new Error(`KuCoin symbols: ${data.msg ?? data.code}`);
    return (data.data as { symbol: string; quoteCurrency: string; enableTrading: boolean }[])
      .filter((s) => s.quoteCurrency === "USDT" && s.enableTrading)
      .map((s) => s.symbol);
  },

  async fetchRecentCandles(symbol: string, count = 5): Promise<NormalizedCandle[]> {
    const now = Math.floor(Date.now() / 1000);
    const fiveMin = 5 * 60;
    const startAt = now - fiveMin * (count + 3);
    const res = await fetchWithTimeout(
      `${BASE}/market/candles?type=5min&symbol=${symbol}&startAt=${startAt}&endAt=${now}`
    );
    if (!res.ok) throw new Error(`KuCoin candles ${res.status}`);
    const data = await res.json();
    if (data.code !== "200000") throw new Error(`KuCoin candles: ${data.msg ?? data.code}`);
    // KuCoin returns [time(sec), open, close, high, low, volume, turnover] NEWEST FIRST
    const raw: string[][] = data.data ?? [];
    const nowMs = Date.now();
    const completed = raw
      .filter(([t]) => parseInt(t) * 1000 < nowMs - 10_000)
      .reverse(); // ascending
    return completed.slice(-count).map(([t, open, close, high, low, volume]) => ({
      openTime: parseInt(t) * 1000,
      closeTime: (parseInt(t) + fiveMin) * 1000,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }));
  },

  getTVSymbol(symbol: string): string {
    return `KUCOIN:${symbol.replace("-", "")}`;
  },

  getBaseCoin(symbol: string): string {
    // BTC-USDT → BTC
    return symbol.split("-")[0].toUpperCase();
  },
};
