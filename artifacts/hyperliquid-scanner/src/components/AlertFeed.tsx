
import { useState, useEffect } from "react";
import { PatternAlert } from "../lib/patternDetection";
import { Bell, TrendingUp, Clock, BarChart2, Zap } from "lucide-react";

interface AlertFeedProps {
  alerts: PatternAlert[];
  onClear: () => void;
  onOpenChart: (alert: PatternAlert) => void;
}

function formatPrice(n: number) {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function useRelativeTime(ts: number) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  return `${diffMin} min ago`;
}

function AgeMeter({ bar3CloseTime }: { bar3CloseTime: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Date.now() - bar3CloseTime;
  const pct = Math.min(100, (elapsed / (30 * 60 * 1000)) * 100);
  const color = pct < 40 ? "#34d399" : pct < 70 ? "#fbbf24" : "#f87171";
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {Math.round(pct)}% of 30 min window
      </span>
    </div>
  );
}

function AlertCard({ alert, onOpenChart }: { alert: PatternAlert; onOpenChart: (a: PatternAlert) => void }) {
  const age = useRelativeTime(alert.detectedAt);
  return (
    <div
      className="group bg-emerald-950/40 border border-emerald-500/25 rounded-lg p-3 hover:border-emerald-500/50 transition-colors cursor-pointer"
      onClick={() => onOpenChart(alert)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-emerald-300 font-bold font-mono text-base">{alert.symbol}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-mono font-semibold"
            style={{
              backgroundColor: `${alert.exchangeColor}22`,
              color: alert.exchangeColor,
              border: `1px solid ${alert.exchangeColor}44`,
            }}
          >
            {alert.exchangeName}
          </span>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
            +{alert.gapPercent.toFixed(3)}% gap
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-zinc-500 text-xs">
            <Clock className="w-3 h-3" />
            {age}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <BarChart2 className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="bg-zinc-900/60 rounded p-2">
          <div className="text-zinc-500 mb-1">Bar 1</div>
          <div className="text-zinc-300">H: <span className="text-red-400">{formatPrice(alert.bar1.high)}</span></div>
          <div className="text-zinc-300">L: {formatPrice(alert.bar1.low)}</div>
        </div>
        <div className="bg-zinc-900/60 rounded p-2">
          <div className="text-zinc-500 mb-1">Bar 2</div>
          <div className="text-zinc-300">H: {formatPrice(alert.bar2.high)}</div>
          <div className="text-zinc-300">L: {formatPrice(alert.bar2.low)}</div>
        </div>
        <div className="bg-zinc-900/60 rounded p-2">
          <div className="text-zinc-500 mb-1">Bar 3</div>
          <div className="text-zinc-300">H: {formatPrice(alert.bar3.high)}</div>
          <div className="text-zinc-300">L: <span className="text-emerald-400">{formatPrice(alert.bar3.low)}</span></div>
        </div>
      </div>

      <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
        <span className="text-red-400 font-mono">{formatPrice(alert.bar1.high)}</span>
        <span className="text-zinc-600 mx-1">→ gap →</span>
        <span className="text-emerald-400 font-mono">{formatPrice(alert.bar3.low)}</span>
        <span className="ml-auto text-zinc-600 group-hover:text-zinc-400 transition-colors">
          Click for chart
        </span>
      </div>

      <AgeMeter bar3CloseTime={alert.bar3CloseTime} />
    </div>
  );
}

export function AlertFeed({ alerts, onClear, onOpenChart }: AlertFeedProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">Pattern Alerts</span>
          {alerts.length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2 py-0.5 rounded-full font-mono">
              {alerts.length}
            </span>
          )}
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            30-min window · auto-expires
          </span>
        </div>
        {alerts.length > 0 && (
          <button onClick={onClear} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
            <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No fresh patterns yet</p>
            <p className="text-xs mt-1 opacity-60">Only patterns within the last 30 min are shown</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onOpenChart={onOpenChart} />
          ))
        )}
      </div>
    </div>
  );
}
