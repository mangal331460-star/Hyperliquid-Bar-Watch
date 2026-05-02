
const HYPERLIQUID_API = "https://api.hyperliquid.xyz/info";

export interface Candle {
  t: number; // open time
  T: number; // close time
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v: string; // volume
  n: number; // number of trades
}

export interface Asset {
  name: string;
  szDecimals: number;
}

async function post(body: object) {
  const res = await fetch(HYPERLIQUID_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
  return res.json();
}

export async function fetchAllAssets(): Promise<Asset[]> {
  const data = await post({ type: "meta" });
  return data.universe as Asset[];
}

export async function fetchCandles(
  coin: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<Candle[]> {
  const data = await post({
    type: "candleSnapshot",
    req: { coin, interval, startTime, endTime },
  });
  return data as Candle[];
}

export async function fetchRecentCandles(
  coin: string,
  count = 5
): Promise<Candle[]> {
  const endTime = Date.now();
  const fiveMinMs = 5 * 60 * 1000;
  const startTime = endTime - fiveMinMs * (count + 2);
  const candles = await fetchCandles(coin, "5m", startTime, endTime);
  // Return only completed candles (exclude the currently forming one)
  const completed = candles.filter((c) => c.T < Date.now() - 10000);
  return completed.slice(-count);
}
