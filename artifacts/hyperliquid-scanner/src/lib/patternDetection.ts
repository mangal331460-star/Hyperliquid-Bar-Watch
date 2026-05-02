
import { Candle } from "./hyperliquid";

export interface PatternAlert {
  id: string;
  coin: string;
  detectedAt: number;
  bar1: { open: number; close: number; high: number; low: number; time: number };
  bar2: { open: number; close: number; high: number; low: number; time: number };
  bar3: { open: number; close: number; high: number; low: number; time: number };
  gapPercent: number;
}

function parse(candle: Candle) {
  return {
    open: parseFloat(candle.o),
    close: parseFloat(candle.c),
    high: parseFloat(candle.h),
    low: parseFloat(candle.l),
    time: candle.t,
  };
}

/**
 * Three-bar pattern: bar1.high is "well below" bar3.low.
 * minGapPercent: the minimum required gap between bar1.high and bar3.low, as a percentage.
 */
export function detectThreeBarPattern(
  candles: Candle[],
  coin: string,
  minGapPercent = 0.1
): PatternAlert | null {
  if (candles.length < 3) return null;

  // Look at the last 3 completed candles
  const last3 = candles.slice(-3);
  const bar1 = parse(last3[0]);
  const bar2 = parse(last3[1]);
  const bar3 = parse(last3[2]);

  // Core condition: bar3.low > bar1.high (bar3's low is above bar1's high)
  if (bar3.low <= bar1.high) return null;

  // Calculate the gap as a percentage of bar1's high
  const gapPercent = ((bar3.low - bar1.high) / bar1.high) * 100;

  // Apply minimum gap threshold
  if (gapPercent < minGapPercent) return null;

  const id = `${coin}-${bar1.time}-${bar3.time}`;

  return {
    id,
    coin,
    detectedAt: Date.now(),
    bar1,
    bar2,
    bar3,
    gapPercent,
  };
}
