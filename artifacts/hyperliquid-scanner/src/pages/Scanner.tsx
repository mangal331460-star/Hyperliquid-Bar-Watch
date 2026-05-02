
import { useState, useEffect } from "react";
import { useScanner } from "../hooks/useScanner";
import { AlertFeed } from "../components/AlertFeed";
import { AssetGrid } from "../components/AssetGrid";
import { Play, Square, RefreshCw, Settings, Wifi, WifiOff, ChevronDown } from "lucide-react";

const SCAN_INTERVALS = [
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
  { label: "10 min", value: 600_000 },
];

export default function Scanner() {
  const [minGapPercent, setMinGapPercent] = useState(0.1);
  const [intervalMs, setIntervalMs] = useState(300_000);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [prevAlertCount, setPrevAlertCount] = useState(0);

  const {
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
  } = useScanner({ minGapPercent, intervalMs, maxAlerts: 200 });

  // Load assets on mount
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Browser notifications
  useEffect(() => {
    if (alerts.length > prevAlertCount && notificationsEnabled) {
      const newAlerts = alerts.slice(0, alerts.length - prevAlertCount);
      newAlerts.forEach((a) => {
        new Notification(`Pattern on ${a.coin}`, {
          body: `3-bar gap: +${a.gapPercent.toFixed(3)}% | Bar1 H: ${a.bar1.high.toFixed(4)} → Bar3 L: ${a.bar3.low.toFixed(4)}`,
          icon: "/favicon.ico",
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

  const nextScanCountdown = isRunning ? intervalMs / 1000 : null;

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-zinc-200 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
          <span className="font-bold text-white tracking-tight text-lg">Hyperliquid Scanner</span>
          <span className="text-xs text-zinc-600 font-mono">5m chart · 3-bar gap</span>
        </div>
        <div className="flex items-center gap-2">
          {!notificationsEnabled && (
            <button
              onClick={requestNotifications}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-700 rounded px-2 py-1"
            >
              Enable notifications
            </button>
          )}
          {notificationsEnabled && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500">
              <Wifi className="w-3 h-3" />
              Notifications on
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
        <div className="border-b border-zinc-800/80 bg-zinc-900/50 px-6 py-4">
          <div className="flex flex-wrap gap-6 items-end">
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
              <p className="text-xs text-zinc-600 mt-1">Gap between bar1 high and bar3 low</p>
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
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="px-6 py-2 bg-zinc-900/30 border-b border-zinc-800/50 flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Assets:</span>
          <span className="text-white">{assets.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Alerts:</span>
          <span className="text-emerald-400">{alerts.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Gap threshold:</span>
          <span className="text-white">{minGapPercent}%</span>
        </div>
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

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 bg-red-950/50 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Controls + Asset Grid */}
        <div className="w-72 border-r border-zinc-800/80 flex flex-col">
          {/* Controls */}
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex gap-2">
              {!isRunning ? (
                <button
                  onClick={startScanning}
                  disabled={assets.length === 0 || loadingAssets}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
                >
                  <Play className="w-4 h-4" />
                  Start Scan
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

          {/* Asset Grid */}
          <div className="flex-1 overflow-hidden p-4">
            <AssetGrid
              assetStates={assetStates}
              totalAssets={assets.length}
              scanProgress={scanProgress}
            />
          </div>
        </div>

        {/* Right: Alert Feed */}
        <div className="flex-1 p-4 overflow-hidden">
          <AlertFeed alerts={alerts} onClear={clearAlerts} />
        </div>
      </div>
    </div>
  );
}
