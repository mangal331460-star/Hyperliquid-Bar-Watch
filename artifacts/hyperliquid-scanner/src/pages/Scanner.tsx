
import { useState, useEffect, useMemo, useCallback } from "react";
import { useScanner } from "../hooks/useScanner";
import { AlertFeed } from "../components/AlertFeed";
import { AssetGrid } from "../components/AssetGrid";
import { ChartModal } from "../components/ChartModal";
import { PatternAlert } from "../lib/patternDetection";
import { ExchangeAdapter } from "../lib/exchanges";
import { hyperliquidAdapter } from "../lib/hyperliquidAdapter";
import { binanceAdapter } from "../lib/binanceAdapter";
import { kucoinAdapter } from "../lib/kucoinAdapter";
import { fetchTopSymbols } from "../lib/marketCap";
import { Play, Square, RefreshCw, Settings, Wifi, TrendingUp, Loader2 } from "lucide-react";

const ALL_ADAPTERS: ExchangeAdapter[] = [hyperliquidAdapter, binanceAdapter, kucoinAdapter];

const SCAN_INTERVALS = [
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
  { label: "10 min", value: 600_000 },
];

const MC_LIMITS: { label: string; value: number | null }[] = [
  { label: "All", value: null },
  { label: "Top 100", value: 100 },
  { label: "Top 200", value: 200 },
  { label: "Top 300", value: 300 },
];

interface ChartTarget {
  tvSymbol: string;
  displayName: string;
  exchangeName: string;
  exchangeColor: string;
}

export default function Scanner() {
  const [minGapPercent, setMinGapPercent] = useState(0.1);
  const [intervalMs, setIntervalMs] = useState(300_000);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [prevAlertCount, setPrevAlertCount] = useState(0);
  const [activeExchangeIds, setActiveExchangeIds] = useState<Set<string>>(
    new Set(["hyperliquid"])
  );
  const [chartTarget, setChartTarget] = useState<ChartTarget | null>(null);
  const [mcLimit, setMcLimit] = useState<number | null>(null);
  const [topSymbols, setTopSymbols] = useState<Set<string> | null>(null);
  const [loadingMc, setLoadingMc] = useState(false);
  const [mcError, setMcError] = useState<string | null>(null);

  const adapters = useMemo(
    () => ALL_ADAPTERS.filter((a) => activeExchangeIds.has(a.id)),
    [activeExchangeIds]
  );

  const {
    isRunning,
    targets,
    totalLoaded,
    assetStates,
    alerts,
    scanProgress,
    loadingAssets,
    errors,
    loadAssets,
    startScanning,
    stopScanning,
    clearAlerts,
  } = useScanner({ adapters, minGapPercent, intervalMs, maxAlerts: 200, topSymbols });

  useEffect(() => {
    if (adapters.length > 0) loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapters]);

  // Fetch top symbols whenever mcLimit changes
  useEffect(() => {
    if (mcLimit === null) {
      setTopSymbols(null);
      setMcError(null);
      return;
    }
    setLoadingMc(true);
    setMcError(null);
    fetchTopSymbols(mcLimit)
      .then((syms) => setTopSymbols(syms))
      .catch(() => setMcError("CoinGecko fetch failed — showing all coins"))
      .finally(() => setLoadingMc(false));
  }, [mcLimit]);

  // Browser notifications
  useEffect(() => {
    if (alerts.length > prevAlertCount && notificationsEnabled) {
      alerts.slice(0, alerts.length - prevAlertCount).forEach((a) => {
        new Notification(`Pattern on ${a.symbol} (${a.exchangeName})`, {
          body: `3-bar gap: +${a.gapPercent.toFixed(3)}% | Bar1 H: ${a.bar1.high} → Bar3 L: ${a.bar3.low}`,
        });
      });
    }
    setPrevAlertCount(alerts.length);
  }, [alerts, notificationsEnabled, prevAlertCount]);

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationsEnabled(perm === "granted");
    }
  };

  const toggleExchange = (id: string) => {
    if (isRunning) return;
    setActiveExchangeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openChart = useCallback(
    (symbol: string, exchangeId: string, exchangeName: string, exchangeColor: string) => {
      const adapter = ALL_ADAPTERS.find((a) => a.id === exchangeId);
      const tvSymbol = adapter?.getTVSymbol(symbol) ?? symbol;
      setChartTarget({ tvSymbol, displayName: symbol, exchangeName, exchangeColor });
    },
    []
  );

  const openChartFromAlert = useCallback((alert: PatternAlert) => {
    setChartTarget({
      tvSymbol: alert.tvSymbol,
      displayName: alert.symbol,
      exchangeName: alert.exchangeName,
      exchangeColor: alert.exchangeColor,
    });
  }, []);

  const filteredCount = targets.length;
  const isFiltered = mcLimit !== null && topSymbols !== null;

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-zinc-200 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
          <span className="font-bold text-white tracking-tight">Hyperliquid Scanner</span>
          <span className="text-xs text-zinc-600 font-mono hidden sm:inline">5m · 3-bar gap</span>
        </div>

        {/* Exchange Toggles */}
        <div className="flex items-center gap-1.5">
          {ALL_ADAPTERS.map((a) => {
            const active = activeExchangeIds.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleExchange(a.id)}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={
                  active
                    ? { backgroundColor: `${a.color}22`, color: a.color, borderColor: `${a.color}55` }
                    : { backgroundColor: "transparent", color: "#52525b", borderColor: "#3f3f46" }
                }
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? a.color : "#52525b" }} />
                {a.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {!notificationsEnabled && (
            <button
              onClick={requestNotifications}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-700 rounded px-2 py-1 hidden sm:flex"
            >
              Enable alerts
            </button>
          )}
          {notificationsEnabled && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500">
              <Wifi className="w-3 h-3" />
              <span className="hidden sm:inline">Alerts on</span>
            </div>
          )}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`p-1.5 rounded border transition-colors ${
              showSettings ? "border-zinc-600 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
          <div className="flex flex-wrap gap-6 items-start">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Min Gap %</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={minGapPercent}
                  onChange={(e) => setMinGapPercent(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-zinc-500 text-sm">%</span>
              </div>
              <p className="text-xs text-zinc-600 mt-1">Gap between bar1 high → bar3 low</p>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Rescan Interval</label>
              <div className="flex gap-1">
                {SCAN_INTERVALS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIntervalMs(opt.value)}
                    className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
                      intervalMs === opt.value
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Scan by Market Cap
              </label>
              <div className="flex gap-1">
                {MC_LIMITS.map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setMcLimit(opt.value)}
                    disabled={isRunning || loadingMc}
                    className={`px-3 py-1.5 rounded text-sm font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      mcLimit === opt.value
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {loadingMc && (
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching market cap data…
                </p>
              )}
              {mcError && <p className="text-xs text-red-400 mt-1">{mcError}</p>}
              {isFiltered && !loadingMc && (
                <p className="text-xs text-violet-400 mt-1">
                  Filtered to top {mcLimit} coins · {filteredCount} of {totalLoaded} assets match
                </p>
              )}
              {!isFiltered && !loadingMc && mcLimit === null && (
                <p className="text-xs text-zinc-600 mt-1">Scanning all listed assets</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-zinc-900/30 border-b border-zinc-800/50 flex items-center gap-4 text-xs font-mono flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Scanning:</span>
          <span className="text-white font-semibold">{filteredCount}</span>
          {isFiltered && (
            <span className="text-violet-400">/ {totalLoaded} (top {mcLimit})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Alerts:</span>
          <span className="text-emerald-400">{alerts.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Gap ≥</span>
          <span className="text-white">{minGapPercent}%</span>
        </div>
        {loadingMc && (
          <div className="flex items-center gap-1 text-violet-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading market cap…
          </div>
        )}
        {errors.length > 0 && <div className="text-red-400">{errors.join(" · ")}</div>}
        {isRunning && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400">Scanning</span>
            {scanProgress > 0 && scanProgress < 100 && (
              <span className="text-zinc-500">({scanProgress}%)</span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-zinc-800/80 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-zinc-800/50">
            <div className="flex gap-2">
              {!isRunning ? (
                <button
                  onClick={startScanning}
                  disabled={filteredCount === 0 || loadingAssets || loadingMc}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
                >
                  <Play className="w-4 h-4" />
                  Start Scan
                  {isFiltered && (
                    <span className="text-emerald-200 font-normal text-xs">({filteredCount})</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              )}
              <button
                onClick={loadAssets}
                disabled={loadingAssets || isRunning}
                className="p-2 border border-zinc-700 rounded text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Reload asset list"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAssets ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-3">
            <AssetGrid
              assetStates={assetStates}
              totalAssets={filteredCount}
              scanProgress={scanProgress}
              onOpenChart={openChart}
              topSymbols={topSymbols}
            />
          </div>
        </div>

        {/* Alert Feed */}
        <div className="flex-1 p-4 overflow-hidden">
          <AlertFeed alerts={alerts} onClear={clearAlerts} onOpenChart={openChartFromAlert} />
        </div>
      </div>

      {/* Chart Modal */}
      {chartTarget && (
        <ChartModal
          tvSymbol={chartTarget.tvSymbol}
          displayName={chartTarget.displayName}
          exchangeName={chartTarget.exchangeName}
          exchangeColor={chartTarget.exchangeColor}
          onClose={() => setChartTarget(null)}
        />
      )}
    </div>
  );
}
