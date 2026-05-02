
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAllAssets, fetchRecentCandles, Asset } from "../lib/hyperliquid";
import { detectThreeBarPattern, PatternAlert } from "../lib/patternDetection";

export type AssetStatus = "idle" | "scanning" | "error" | "done";

export interface AssetState {
  name: string;
  status: AssetStatus;
  lastChecked: number | null;
  lastHigh: number | null;
  lastLow: number | null;
}

interface ScannerOptions {
  minGapPercent: number;
  intervalMs: number;
  maxAlerts: number;
}

export function useScanner(options: ScannerOptions) {
  const { minGapPercent, intervalMs, maxAlerts } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetStates, setAssetStates] = useState<Record<string, AssetState>>({});
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const stopRef = useRef(false);
  const scanLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    setError(null);
    try {
      const all = await fetchAllAssets();
      setAssets(all);
      const initial: Record<string, AssetState> = {};
      for (const a of all) {
        initial[a.name] = { name: a.name, status: "idle", lastChecked: null, lastHigh: null, lastLow: null };
      }
      setAssetStates(initial);
    } catch (e) {
      setError("Failed to load assets from Hyperliquid. Check your connection.");
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const scanAll = useCallback(async (assetList: Asset[], gapPct: number, seen: Set<string>) => {
    const newAlerts: PatternAlert[] = [];
    const newSeen = new Set(seen);

    for (let i = 0; i < assetList.length; i++) {
      if (stopRef.current) break;

      const asset = assetList[i];
      setAssetStates((prev) => ({
        ...prev,
        [asset.name]: { ...prev[asset.name], status: "scanning" },
      }));

      try {
        const candles = await fetchRecentCandles(asset.name, 5);
        const alert = detectThreeBarPattern(candles, asset.name, gapPct);

        if (alert && !newSeen.has(alert.id)) {
          newSeen.add(alert.id);
          newAlerts.push(alert);
        }

        const lastCandle = candles[candles.length - 1];
        setAssetStates((prev) => ({
          ...prev,
          [asset.name]: {
            ...prev[asset.name],
            status: "done",
            lastChecked: Date.now(),
            lastHigh: lastCandle ? parseFloat(lastCandle.h) : null,
            lastLow: lastCandle ? parseFloat(lastCandle.l) : null,
          },
        }));
      } catch {
        setAssetStates((prev) => ({
          ...prev,
          [asset.name]: { ...prev[asset.name], status: "error", lastChecked: Date.now() },
        }));
      }

      setScanProgress(Math.round(((i + 1) / assetList.length) * 100));

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 80));
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => {
        const merged = [...newAlerts, ...prev];
        return merged.slice(0, maxAlerts);
      });
      setSeenIds(newSeen);
    }
  }, [maxAlerts]);

  const startScanning = useCallback(() => {
    if (assets.length === 0) return;
    stopRef.current = false;
    setIsRunning(true);

    const run = async () => {
      if (stopRef.current) return;
      setScanProgress(0);
      await scanAll(assets, minGapPercent, seenIds);
      if (!stopRef.current) {
        scanLoopRef.current = setTimeout(run, intervalMs);
      }
    };

    run();
  }, [assets, minGapPercent, intervalMs, scanAll, seenIds]);

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
    assets,
    assetStates,
    alerts,
    scanProgress,
    loadingAssets,
    error,
    loadAssets,
    startScanning,
    stopScanning,
    clearAlerts,
  };
}
