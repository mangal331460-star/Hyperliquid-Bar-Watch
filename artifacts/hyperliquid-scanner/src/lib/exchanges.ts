
export interface NormalizedCandle {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ExchangeAdapter {
  id: string;
  name: string;
  color: string;
  fetchAssets(): Promise<string[]>;
  fetchRecentCandles(symbol: string, count?: number): Promise<NormalizedCandle[]>;
  getTVSymbol(symbol: string): string;
}

export interface ScanTarget {
  symbol: string;
  exchangeId: string;
  exchangeName: string;
  exchangeColor: string;
  tvSymbol: string;
}
