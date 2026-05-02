
import { AssetState } from "../hooks/useScanner";
import { CheckCircle, AlertCircle, Loader2, Circle } from "lucide-react";

interface AssetGridProps {
  assetStates: Record<string, AssetState>;
  totalAssets: number;
  scanProgress: number;
}

function StatusIcon({ status }: { status: AssetState["status"] }) {
  switch (status) {
    case "scanning":
      return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
    case "done":
      return <CheckCircle className="w-3 h-3 text-emerald-500" />;
    case "error":
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return <Circle className="w-3 h-3 text-zinc-700" />;
  }
}

export function AssetGrid({ assetStates, totalAssets, scanProgress }: AssetGridProps) {
  const states = Object.values(assetStates);
  const scanned = states.filter((s) => s.status === "done" || s.status === "error").length;
  const errors = states.filter((s) => s.status === "error").length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Assets</span>
        <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
          <span>{scanned}/{totalAssets}</span>
          {errors > 0 && <span className="text-red-400">{errors} errors</span>}
        </div>
      </div>

      {totalAssets > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="mt-1 text-xs font-mono text-zinc-600 text-right">{scanProgress}%</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {states.length === 0 ? (
          <div className="text-sm text-zinc-600 text-center mt-4">No assets loaded</div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {states.map((asset) => (
              <div
                key={asset.name}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                  asset.status === "scanning"
                    ? "bg-blue-950/30 border border-blue-500/20"
                    : asset.status === "done"
                    ? "bg-zinc-900/40 border border-zinc-800"
                    : asset.status === "error"
                    ? "bg-red-950/20 border border-red-500/15"
                    : "border border-transparent"
                }`}
              >
                <StatusIcon status={asset.status} />
                <span className={
                  asset.status === "scanning" ? "text-blue-300" :
                  asset.status === "done" ? "text-zinc-300" :
                  asset.status === "error" ? "text-red-400" :
                  "text-zinc-600"
                }>
                  {asset.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
