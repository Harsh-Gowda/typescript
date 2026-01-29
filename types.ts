
export enum Emotion {
  FEAR = 'Fear',
  GREED = 'Greed',
  NEUTRAL = 'Neutral',
  CONFIDENT = 'Confident',
  ANXIOUS = 'Anxious',
  REVENGE = 'Revenge-Seeking'
}

export enum TradeStatus {
  OPEN = 'Open',
  CLOSED = 'Closed'
}

export type Currency = 'USD' | 'INR';

export interface Trade {
  id: string;
  symbol: string;
  type: 'Long' | 'Short';
  entryPrice: number;
  stopLoss: number;
  target: number;
  exitPrice?: number;
  entryEmotion: Emotion;
  exitEmotion?: Emotion;
  status: TradeStatus;
  timestamp: number;
  notes?: string;
  pnl?: number;
  currency: Currency;
  exitChartUrl?: string;
}

export interface TradingStats {
  winRate: number;
  totalPnl: number;
  avgRMultiple: number;
}
