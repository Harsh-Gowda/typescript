
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

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONS CHAIN TYPES (Indian Market)
// ─────────────────────────────────────────────────────────────────────────────

/** CE = Call Option (profit if market goes UP), PE = Put Option (profit if market goes DOWN) */
export type OptionType = 'CE' | 'PE';

/** Buy side = buying premium (debit), Sell side = selling premium (credit/writing) */
export type OptionSide = 'BUY' | 'SELL';

/** Indian market underlying instruments */
export type OptionUnderlying =
  | 'NIFTY'
  | 'BANKNIFTY'
  | 'SENSEX'
  | 'FINNIFTY'
  | 'MIDCPNIFTY'
  | 'CUSTOM';

/** Standard lot sizes per underlying (NSE/BSE) */
export const LOT_SIZES: Record<string, number> = {
  NIFTY: 25,
  BANKNIFTY: 15,
  SENSEX: 10,
  FINNIFTY: 25,
  MIDCPNIFTY: 75,
  CUSTOM: 1,
};

/** Zerodha-style brokerage: Rs.20 per order or 0.03% whichever is lower */
export const BROKERAGE_PER_ORDER = 20;

/** STT rate for options (on sell side only, 0.0625% of premium x qty) */
export const STT_RATE = 0.000625;

export interface OptionTrade {
  id: string;
  user_id?: string;

  // Contract Details
  underlying: OptionUnderlying;
  customSymbol?: string;           // Used when underlying = 'CUSTOM'
  strikePrice: number;
  optionType: OptionType;          // CE or PE
  expiryDate: string;              // 'YYYY-MM-DD'
  side: OptionSide;                // BUY or SELL

  // Position Details
  entryPremium: number;            // Price paid/received per unit
  exitPremium?: number;            // Price at exit
  lots: number;                    // Number of lots
  lotSize: number;                 // Qty per lot (auto-filled based on underlying)

  // Computed totals (stored for history)
  totalQty: number;                // lots x lotSize
  entryValue: number;              // entryPremium x totalQty
  exitValue?: number;              // exitPremium x totalQty

  // P&L Breakdown (INR)
  grossPnl?: number;               // (exitPremium - entryPremium) x totalQty [for BUY]
  brokerage?: number;              // Rs.20 per order x 2 (entry + exit)
  stt?: number;                    // STT on sell leg (0.0625% of sell premium x qty)
  otherCharges?: number;           // Exchange charges + GST + SEBI turnover fee (est.)
  netPnl?: number;                 // grossPnl - brokerage - stt - otherCharges
  roi?: number;                    // netPnl / entryValue x 100

  // Psychology & Meta
  entryEmotion: Emotion;
  exitEmotion?: Emotion;
  status: TradeStatus;
  timestamp: number;               // Unix ms (entry time)
  exitTimestamp?: number;          // Unix ms (exit time)
  notes?: string;
  exitChartUrl?: string;

  // Strategy tag (optional)
  strategy?: string;               // e.g. "Scalp", "Swing", "Hedged", "Straddle"
}

export interface OptionStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalNetPnl: number;
  totalGrossPnl: number;
  totalCharges: number;
  avgRoi: number;
  bestTrade: number;
  worstTrade: number;
}
