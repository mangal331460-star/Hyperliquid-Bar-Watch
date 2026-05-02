
import { useEffect, useRef, useId } from "react";
import { X, ExternalLink } from "lucide-react";

interface ChartModalProps {
  tvSymbol: string;
  displayName: string;
  exchangeName: string;
  exchangeColor: string;
  onClose: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView: any;
  }
}

export function ChartModal({ tvSymbol, displayName, exchangeName, exchangeColor, onClose }: ChartModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const widgetContainerId = `tv_${uid}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean previous widget
    container.innerHTML = `<div id="${widgetContainerId}" style="height:100%;width:100%;"></div>`;

    const loadWidget = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          container_id: widgetContainerId,
          autosize: true,
          symbol: tvSymbol,
          interval: "5",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#0d0f12",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          withdateranges: true,
          save_image: false,
          backgroundColor: "#0a0b0e",
          gridColor: "rgba(255,255,255,0.04)",
        });
      }
    };

    if (window.TradingView) {
      loadWidget();
    } else {
      const script = document.createElement("script");
      script.id = "tv-widget-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = loadWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [tvSymbol, widgetContainerId]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-4xl flex flex-col bg-[#0a0b0e] border-l border-zinc-800 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: exchangeColor }} />
            <span className="font-bold text-white font-mono text-lg">{displayName}</span>
            <span
              className="text-xs px-2 py-0.5 rounded font-mono font-semibold"
              style={{ backgroundColor: `${exchangeColor}22`, color: exchangeColor, border: `1px solid ${exchangeColor}44` }}
            >
              {exchangeName}
            </span>
            <span className="text-xs text-zinc-500 font-mono">5m chart</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}&interval=5`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Open in TradingView"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Chart */}
        <div className="flex-1 min-h-0" ref={containerRef} />
      </div>
    </div>
  );
}
