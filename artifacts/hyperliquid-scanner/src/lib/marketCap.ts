
const CACHE_KEY = "hl_scanner_mc_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  symbols: string[];
  ts: number;
}

async function fetchWithTimeout(url: string, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Returns a Set of uppercase base coin symbols for the top N coins by market cap.
 * Caches in localStorage for 1 hour to avoid hitting rate limits.
 */
export async function fetchTopSymbols(limit: number): Promise<Set<string>> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.ts < CACHE_TTL && entry.symbols.length >= limit) {
        return new Set(entry.symbols.slice(0, limit));
      }
    }
  } catch {
    // ignore parse errors
  }

  // CoinGecko free API — up to 250 per page
  const pages = Math.ceil(limit / 250);
  const allSymbols: string[] = [];

  for (let page = 1; page <= pages; page++) {
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`
    );
    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
    const data: { symbol: string }[] = await res.json();
    allSymbols.push(...data.map((c) => c.symbol.toUpperCase()));
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ symbols: allSymbols, ts: Date.now() }));
  } catch {
    // ignore storage errors
  }

  return new Set(allSymbols.slice(0, limit));
}
