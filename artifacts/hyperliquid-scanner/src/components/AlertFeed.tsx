
import { PatternAlert } from "../lib/patternDetection";
import { Bell, TrendingUp, Clock } from "lucide-react";

interface AlertFeedProps {
  alerts: PatternAlert[];
  onClear: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatPrice(n: number) {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export function AlertFeed({ alerts, onClear }: AlertFeedProps) {
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
        </div>
        {alerts.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
            <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No patterns detected yet</p>
            <p className="text-xs mt-1 opacity-60">Start the scanner to monitor assets</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-emerald-950/40 border border-emerald-500/25 rounded-lg p-3 hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-emerald-300 font-bold font-mono text-base">{alert.coin}</span>
                  <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                    +{alert.gapPercent.toFixed(3)}% gap
                  </span>
                </div>
                <div className="flex items-center gap-1 text-zinc-500 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatTime(alert.detectedAt)}
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
