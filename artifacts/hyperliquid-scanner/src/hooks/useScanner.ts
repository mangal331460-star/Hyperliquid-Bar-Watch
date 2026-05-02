
import { useState, useEffect, useRef, useCallback } from "react";
import { ExchangeAdapter, ScanTarget } from "../lib/exchanges";
import { detectThreeBarPattern, PatternAlert } from "../lib/patternDetection";

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
}

export function useScanner(options: ScannerOptions) {
  const { adapters, minGapPercent, intervalMs, maxAlerts } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [targets, setTargets] = useState<ScanTarget[]>([]);
  const [assetStates, setAssetStates] = useState<Record<string, AssetState>>({});
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const stopRef = useRef(false);
  const scanLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAssets = useCallback(async () => {
    if (adapters.length === 0) return;
    setLoadingAssets(true);
    setErrors([]);
    const allTargets: ScanTarget[] = [];
    const errs: string[] = [];

    for (const adapter of adapters) {
      try {
        const symbols = await adapter.fetchAssets();
        for (const symbol of symbols) {
          allTargets.push({
            symbol,
            exchangeId: adapter.id,
            exchangeName: adapter.name,
            exchangeColor: adapter.color,
            tvSymbol: adapter.getTVSymbol(symbol),
          });
        }
      } catch (e) {
        errs.push(`Failed to load ${adapter.name} assets`);
      }
    }

    setTargets(allTargets);
    const initial: Record<string, AssetState> = {};
    for (const t of allTargets) {
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

      // Group by exchange so we can find the right adapter
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
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, maxAlerts));
        setSeenIds(newSeen);
      }
    },
    [adapters, maxAlerts]
  );

  const startScanning = useCallback(() => {
    if (targets.length === 0) return;
    stopRef.current = false;
    setIsRunning(true);

    const run = async () => {
      if (stopRef.current) return;
      setScanProgress(0);
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
    };
  }, []);

  return {
    isRunning,
    targets,
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
