
import { useState, useEffect, useRef, useCallback } from "react";
import { ExchangeAdapter, ScanTarget } from "../lib/exchanges";
import { detectThreeBarPattern, PatternAlert, ALERT_RECENCY_MS, isAlertFresh } from "../lib/patternDetection";
import { playAlertSound } from "../lib/sound";

export type AssetStatus = "idle" | "scanning" | "error" | "done";

export interface AssetState {
  symbol: string;
  exchangeId: string;
  exchangeName: string;
  exchangeColor: string;
  status: AssetStatus;
  lastChecked: number | null;
}

interface ScannerOptions {
  adapters: ExchangeAdapter[];
  minGapPercent: number;
  intervalMs: number;
  maxAlerts: number;
  topSymbols: Set<string> | null;
}

export function useScanner(options: ScannerOptions) {
  const { adapters, minGapPercent, intervalMs, maxAlerts, topSymbols } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [allTargets, setAllTargets] = useState<ScanTarget[]>([]);
  const [assetStates, setAssetStates] = useState<Record<string, AssetState>>({});
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const stopRef = useRef(false);
  const scanLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active targets filtered by market cap
  const targets = topSymbols
    ? allTargets.filter((t) => topSymbols.has(t.baseCoin))
    : allTargets;

  // ── Periodic expiry: remove stale alerts from the feed every minute ──
  useEffect(() => {
    if (isRunning) {
      expiryRef.current = setInterval(() => {
        setAlerts((prev) => prev.filter(isAlertFresh));
      }, 60_000);
    } else {
      if (expiryRef.current) clearInterval(expiryRef.current);
    }
    return () => {
      if (expiryRef.current) clearInterval(expiryRef.current);
    };
  }, [isRunning]);

  const loadAssets = useCallback(async () => {
    if (adapters.length === 0) return;
    setLoadingAssets(true);
    setErrors([]);
    const collected: ScanTarget[] = [];
    const errs: string[] = [];

    for (const adapter of adapters) {
      try {
        const symbols = await adapter.fetchAssets();
        for (const symbol of symbols) {
          collected.push({
            symbol,
            exchangeId: adapter.id,
            exchangeName: adapter.name,
            exchangeColor: adapter.color,
            tvSymbol: adapter.getTVSymbol(symbol),
            baseCoin: adapter.getBaseCoin(symbol),
          });
        }
      } catch {
        errs.push(`Failed to load ${adapter.name} assets`);
      }
    }

    setAllTargets(collected);
    const initial: Record<string, AssetState> = {};
    for (const t of collected) {
      const key = `${t.exchangeId}:${t.symbol}`;
      initial[key] = {
        symbol: t.symbol,
        exchangeId: t.exchangeId,
        exchangeName: t.exchangeName,
        exchangeColor: t.exchangeColor,
        status: "idle",
        lastChecked: null,
      };
    }
    setAssetStates(initial);
    setErrors(errs);
    setLoadingAssets(false);
  }, [adapters]);

  const scanAll = useCallback(
    async (targetList: ScanTarget[], gapPct: number, seen: Set<string>) => {
      const newAlerts: PatternAlert[] = [];
      const newSeen = new Set(seen);
      const adapterMap = new Map(adapters.map((a) => [a.id, a]));

      for (let i = 0; i < targetList.length; i++) {
        if (stopRef.current) break;

        const target = targetList[i];
        const key = `${target.exchangeId}:${target.symbol}`;
        const adapter = adapterMap.get(target.exchangeId);
        if (!adapter) continue;

        setAssetStates((prev) => ({
          ...prev,
          [key]: { ...prev[key], status: "scanning" },
        }));

        try {
          const candles = await adapter.fetchRecentCandles(target.symbol, 5);
          const alert = detectThreeBarPattern(
            candles,
            target.symbol,
            target.exchangeId,
            target.exchangeName,
            target.exchangeColor,
            target.tvSymbol,
            gapPct
          );

          if (alert && !newSeen.has(alert.id)) {
            newSeen.add(alert.id);
            newAlerts.push(alert);
          }

          setAssetStates((prev) => ({
            ...prev,
            [key]: { ...prev[key], status: "done", lastChecked: Date.now() },
          }));
        } catch {
          setAssetStates((prev) => ({
            ...prev,
            [key]: { ...prev[key], status: "error", lastChecked: Date.now() },
          }));
        }

        setScanProgress(Math.round(((i + 1) / targetList.length) * 100));
        await new Promise((r) => setTimeout(r, 60));
      }

      if (newAlerts.length > 0) {
        // Play alert sound for each new match
        playAlertSound();

        setAlerts((prev) => {
          // Merge new alerts, drop any that have already expired, cap at maxAlerts
          const merged = [...newAlerts, ...prev].filter(isAlertFresh);
          return merged.slice(0, maxAlerts);
        });
        setSeenIds(newSeen);
      }

      // Also purge any expired alerts from the existing list
      setAlerts((prev) => prev.filter(isAlertFresh));
    },
    [adapters, maxAlerts]
  );

  const startScanning = useCallback(() => {
    if (targets.length === 0) return;
    stopRef.current = false;
    setIsRunning(true);
    // Clear previous alerts when a fresh scan starts
    setAlerts([]);
    setSeenIds(new Set());

    const run = async () => {
      if (stopRef.current) return;
      setScanProgress(0);
      setAssetStates((prev) => {
        const next = { ...prev };
        for (const t of targets) {
          const key = `${t.exchangeId}:${t.symbol}`;
          if (next[key]) next[key] = { ...next[key], status: "idle" };
        }
        return next;
      });
      await scanAll(targets, minGapPercent, seenIds);
      if (!stopRef.current) {
        scanLoopRef.current = setTimeout(run, intervalMs);
      }
    };
    run();
  }, [targets, minGapPercent, intervalMs, scanAll, seenIds]);

  const stopScanning = useCallback(() => {
    stopRef.current = true;
    setIsRunning(false);
    if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setSeenIds(new Set());
  }, []);

  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
      if (expiryRef.current) clearInterval(expiryRef.current);
    };
  }, []);

  return {
    isRunning,
    targets,
    totalLoaded: allTargets.length,
    assetStates,
    alerts,
    scanProgress,
    loadingAssets,
    errors,
    loadAssets,
    startScanning,
    stopScanning,
    clearAlerts,
  };
}
