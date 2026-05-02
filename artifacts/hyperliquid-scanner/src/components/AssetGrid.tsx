
import { AssetState } from "../hooks/useScanner";
import { CheckCircle, AlertCircle, Loader2, Circle } from "lucide-react";

interface AssetGridProps {
  assetStates: Record<string, AssetState>;
  totalAssets: number;
  scanProgress: number;
  onOpenChart?: (symbol: string, exchangeId: string, exchangeName: string, exchangeColor: string) => void;
  topSymbols: Set<string> | null;
}

function StatusIcon({ status }: { status: AssetState["status"] }) {
  switch (status) {
    case "scanning":
      return <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />;
    case "done":
      return <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />;
    case "error":
      return <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />;
    default:
      return <Circle className="w-3 h-3 text-zinc-700 flex-shrink-0" />;
  }
}

export function AssetGrid({ assetStates, totalAssets, scanProgress, onOpenChart, topSymbols }: AssetGridProps) {
  const allStates = Object.values(assetStates);

  // When a market cap filter is active, only show matching assets in the grid
  const states = topSymbols
    ? allStates.filter((s) => topSymbols.has(s.symbol.replace(/USDT$/, "").replace(/-USDT$/, "").toUpperCase()))
    : allStates;

  const scanned = states.filter((s) => s.status === "done" || s.status === "error").length;
  const errors = states.filter((s) => s.status === "error").length;

  const byExchange = states.reduce<Record<string, AssetState[]>>((acc, s) => {
    acc[s.exchangeId] = acc[s.exchangeId] ?? [];
    acc[s.exchangeId].push(s);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Assets</span>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span>{scanned}/{totalAssets}</span>
          {errors > 0 && <span className="text-red-400">{errors} err</span>}
        </div>
      </div>

      {totalAssets > 0 && (
        <div className="mb-3">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {states.length === 0 ? (
          <div className="text-sm text-zinc-600 text-center mt-4">
            {topSymbols ? "No matching top coins found" : "No assets loaded"}
          </div>
        ) : (
          Object.entries(byExchange).map(([exchangeId, exchangeStates]) => {
            const first = exchangeStates[0];
            const doneCount = exchangeStates.filter((s) => s.status === "done" || s.status === "error").length;
            return (
              <div key={exchangeId}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: first.exchangeColor }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: first.exchangeColor }}>
                    {first.exchangeName}
                  </span>
                  <span className="text-xs text-zinc-600 font-mono ml-auto">
                    {doneCount}/{exchangeStates.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-0.5">
                  {exchangeStates.map((asset) => (
                    <div
                      key={`${asset.exchangeId}:${asset.symbol}`}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs font-mono transition-colors ${
                        asset.status === "scanning"
                          ? "bg-blue-950/30 border border-blue-500/20"
                          : asset.status === "done"
                          ? "bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-900"
                          : asset.status === "error"
                          ? "bg-red-950/20 border border-red-500/15"
                          : "border border-transparent"
                      } ${onOpenChart ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => onOpenChart?.(asset.symbol, asset.exchangeId, asset.exchangeName, asset.exchangeColor)}
                      title={onOpenChart ? `Open ${asset.symbol} chart` : undefined}
                    >
                      <StatusIcon status={asset.status} />
                      <span className={
                        asset.status === "scanning" ? "text-blue-300" :
                        asset.status === "done" ? "text-zinc-300" :
                        asset.status === "error" ? "text-red-400" :
                        "text-zinc-600"
                      }>
                        {asset.symbol.replace(/-?USDT$/, "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
