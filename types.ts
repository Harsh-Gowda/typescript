
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

export interface DisciplineRule {
  maxConsecutiveLosses: number;   // Block trading after N losses in a row
  winCheckpointCount: number;     // Show checkpoint after N wins in a row
  maxTradesPerDay: number;        // Block form after N trades today
  maxDailyLossAmount: number;     // Block after losing this much today (0 = disabled)
}

export interface DisciplineLog {
  date: string;                   // 'YYYY-MM-DD'
  totalTrades: number;
  wins: number;
  losses: number;
  maxLossStreak: number;
  maxWinStreak: number;
  disciplineScore: number;        // 0-100
  ruleViolations: string[];
  netPnl: number;
}
