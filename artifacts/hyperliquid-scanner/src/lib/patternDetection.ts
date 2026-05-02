
import { NormalizedCandle } from "./exchanges";

export const ALERT_RECENCY_MS = 30 * 60 * 1000; // 30 minutes

export interface PatternAlert {
  id: string;
  symbol: string;
  exchangeId: string;
  exchangeName: string;
  exchangeColor: string;
  tvSymbol: string;
  detectedAt: number;
  bar3CloseTime: number; // used for recency check
  bar1: { open: number; close: number; high: number; low: number; time: number };
  bar2: { open: number; close: number; high: number; low: number; time: number };
  bar3: { open: number; close: number; high: number; low: number; time: number };
  gapPercent: number;
}

/**
 * Three-bar pattern: bar1.high is well below bar3.low.
 * Only fires if bar3 closed within the last 30 minutes — stale patterns are ignored.
 */
export function detectThreeBarPattern(
  candles: NormalizedCandle[],
  symbol: string,
  exchangeId: string,
  exchangeName: string,
  exchangeColor: string,
  tvSymbol: string,
  minGapPercent = 0.1
): PatternAlert | null {
  if (candles.length < 3) return null;

  const last3 = candles.slice(-3);
  const bar3Candle = last3[2];

  // ── Recency gate: bar3 must have closed within the last 30 minutes ──
  if (Date.now() - bar3Candle.closeTime > ALERT_RECENCY_MS) return null;

  const bar1 = { open: last3[0].open, close: last3[0].close, high: last3[0].high, low: last3[0].low, time: last3[0].openTime };
  const bar2 = { open: last3[1].open, close: last3[1].close, high: last3[1].high, low: last3[1].low, time: last3[1].openTime };
  const bar3 = { open: bar3Candle.open, close: bar3Candle.close, high: bar3Candle.high, low: bar3Candle.low, time: bar3Candle.openTime };

  // Core condition: bar3.low > bar1.high
  if (bar3.low <= bar1.high) return null;

  const gapPercent = ((bar3.low - bar1.high) / bar1.high) * 100;
  if (gapPercent < minGapPercent) return null;

  return {
    id: `${exchangeId}:${symbol}-${bar1.time}-${bar3.time}`,
    symbol,
    exchangeId,
    exchangeName,
    exchangeColor,
    tvSymbol,
    detectedAt: Date.now(),
    bar3CloseTime: bar3Candle.closeTime,
    bar1,
    bar2,
    bar3,
    gapPercent,
  };
}

export function isAlertFresh(alert: PatternAlert): boolean {
  return Date.now() - alert.bar3CloseTime <= ALERT_RECENCY_MS;
}
