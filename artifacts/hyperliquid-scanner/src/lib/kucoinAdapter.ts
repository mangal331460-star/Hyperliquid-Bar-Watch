
import { ExchangeAdapter, NormalizedCandle } from "./exchanges";

const BASE = "https://api.kucoin.com/api/v1";

export const kucoinAdapter: ExchangeAdapter = {
  id: "kucoin",
  name: "KuCoin",
  color: "#00c8a0",

  async fetchAssets(): Promise<string[]> {
    const res = await fetch(`${BASE}/symbols`);
    if (!res.ok) throw new Error(`KuCoin symbols ${res.status}`);
    const data = await res.json();
    return (data.data as { symbol: string; quoteCurrency: string; enableTrading: boolean }[])
      .filter((s) => s.quoteCurrency === "USDT" && s.enableTrading)
      .map((s) => s.symbol);
  },

  async fetchRecentCandles(symbol: string, count = 5): Promise<NormalizedCandle[]> {
    const now = Math.floor(Date.now() / 1000);
    const fiveMin = 5 * 60;
    const startAt = now - fiveMin * (count + 3);
    const res = await fetch(
      `${BASE}/market/candles?type=5min&symbol=${symbol}&startAt=${startAt}&endAt=${now}`
    );
    if (!res.ok) throw new Error(`KuCoin candles ${res.status}`);
    const data = await res.json();
    // KuCoin returns [time(sec), open, close, high, low, volume, turnover] NEWEST FIRST
    // Note: index order is open, CLOSE, HIGH, LOW (different from standard)
    const raw: string[][] = data.data ?? [];
    const nowMs = Date.now();
    const completed = raw
      .filter(([t]) => parseInt(t) * 1000 < nowMs - 10_000)
      .reverse(); // convert to ascending order
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
    // KuCoin uses BTC-USDT format; TV uses KUCOIN:BTCUSDT
    return `KUCOIN:${symbol.replace("-", "")}`;
  },
};
