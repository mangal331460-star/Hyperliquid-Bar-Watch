
import { NormalizedCandle } from "./exchanges";

export interface PatternAlert {
  id: string;
  symbol: string;
  exchangeId: string;
  exchangeName: string;
  exchangeColor: string;
  tvSymbol: string;
  detectedAt: number;
  bar1: { open: number; close: number; high: number; low: number; time: number };
  bar2: { open: number; close: number; high: number; low: number; time: number };
  bar3: { open: number; close: number; high: number; low: number; time: number };
  gapPercent: number;
}

/**
 * Three-bar pattern: bar1.high is "well below" bar3.low.
 * minGapPercent: minimum gap between bar1.high and bar3.low as a percentage.
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
  const bar1 = { open: last3[0].open, close: last3[0].close, high: last3[0].high, low: last3[0].low, time: last3[0].openTime };
  const bar2 = { open: last3[1].open, close: last3[1].close, high: last3[1].high, low: last3[1].low, time: last3[1].openTime };
  const bar3 = { open: last3[2].open, close: last3[2].close, high: last3[2].high, low: last3[2].low, time: last3[2].openTime };

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
    bar1,
    bar2,
    bar3,
    gapPercent,
  };
}
