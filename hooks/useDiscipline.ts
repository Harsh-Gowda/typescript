import { useMemo, useCallback } from 'react';
import { Trade, TradeStatus, DisciplineRule, DisciplineLog, CapitalRiskConfig, CapitalRiskState } from '../types';

export const DEFAULT_RULES: DisciplineRule = {
  maxConsecutiveLosses: 3,
  winCheckpointCount: 2,
  maxTradesPerDay: 10,
  maxDailyLossAmount: 0,
};

const RULES_STORAGE_KEY   = 'trademind_discipline_rules';
const LOG_STORAGE_KEY     = 'trademind_discipline_logs';
const CAPITAL_RISK_KEY    = 'trademind_capital_risk';

export function loadRules(): DisciplineRule {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw) return { ...DEFAULT_RULES, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_RULES };
}

export function saveRules(rules: DisciplineRule): void {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}

export function loadLogs(): DisciplineLog[] {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DisciplineLog[];
  } catch {}
  return [];
}

export function saveLogs(logs: DisciplineLog[]): void {
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPITAL RISK CONFIG HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CAPITAL_RISK: CapitalRiskConfig = {
  enabled: false,
  startingCapital: 20000,
  riskPercent: 10,
  currentCapital: 20000,
  lastUpdatedDate: '',
};

export function loadCapitalRisk(): CapitalRiskConfig {
  try {
    const raw = localStorage.getItem(CAPITAL_RISK_KEY);
    if (raw) return { ...DEFAULT_CAPITAL_RISK, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_CAPITAL_RISK };
}

export function saveCapitalRisk(cfg: CapitalRiskConfig): void {
  localStorage.setItem(CAPITAL_RISK_KEY, JSON.stringify(cfg));
}

/**
 * Auto-rolls capital forward: if lastUpdatedDate < today,
 * update currentCapital = currentCapital + yesterday's netPnl from trades.
 * Trades are passed in so we can compute yesterday's closed P&L.
 */
export function rollCapitalForward(cfg: CapitalRiskConfig, trades: Trade[]): CapitalRiskConfig {
  const today = new Date().toISOString().slice(0, 10);
  if (cfg.lastUpdatedDate === today) return cfg; // already rolled today

  // Find yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  // Sum yesterday's closed P&L
  const yesterdayPnl = trades
    .filter(t => {
      const d = new Date(t.timestamp).toISOString().slice(0, 10);
      return d === yesterdayKey && t.status === TradeStatus.CLOSED;
    })
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const newCapital = Math.max(0, cfg.currentCapital + yesterdayPnl);
  const updated: CapitalRiskConfig = {
    ...cfg,
    currentCapital: newCapital,
    lastUpdatedDate: today,
  };
  saveCapitalRisk(updated);
  return updated;
}

/**
 * Compute live capital risk state for today.
 * Only counts CLOSED trades from today.
 */
export function computeCapitalRiskState(
  cfg: CapitalRiskConfig,
  todayNetPnl: number
): CapitalRiskState {
  if (!cfg.enabled) {
    return {
      enabled: false,
      dailyLimit: 0,
      usedRisk: 0,
      remainingRisk: 0,
      usedPercent: 0,
      isBreached: false,
      alertLevel: 'safe',
      currentCapital: cfg.currentCapital,
      riskPercent: cfg.riskPercent,
    };
  }

  const dailyLimit = (cfg.currentCapital * cfg.riskPercent) / 100;
  // Only losses consume the daily limit (positive P&L doesn't count)
  const usedRisk = todayNetPnl < 0 ? Math.abs(todayNetPnl) : 0;
  const remainingRisk = Math.max(0, dailyLimit - usedRisk);
  const usedPercent = dailyLimit > 0 ? (usedRisk / dailyLimit) * 100 : 0;
  const isBreached = usedRisk >= dailyLimit;

  let alertLevel: CapitalRiskState['alertLevel'] = 'safe';
  if (isBreached) alertLevel = 'breached';
  else if (usedPercent >= 75) alertLevel = 'danger';
  else if (usedPercent >= 50) alertLevel = 'warning';

  return {
    enabled: true,
    dailyLimit,
    usedRisk,
    remainingRisk,
    usedPercent,
    isBreached,
    alertLevel,
    currentCapital: cfg.currentCapital,
    riskPercent: cfg.riskPercent,
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isToday(ts: number): boolean {
  return new Date(ts).toISOString().slice(0, 10) === todayKey();
}

/** Compute the tail streak of a sorted-by-time array of booleans (true=win). */
function computeStreak(results: boolean[]): { consLosses: number; consWins: number } {
  let consLosses = 0;
  let consWins = 0;

  // Walk backwards from most-recent trade
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]) {
      // it's a win
      if (consLosses > 0) break; // streak broken by a loss already counted
      consWins++;
    } else {
      // it's a loss
      if (consWins > 0) break;
      consLosses++;
    }
  }
  return { consLosses, consWins };
}

export interface DisciplineState {
  rules: DisciplineRule;
  consecutiveLosses: number;
  consecutiveWins: number;
  isBlocked: boolean;
  blockReason: string | null;
  isProfitCheckpoint: boolean;
  todayClosedCount: number;
  todayTotalCount: number;
  todayWins: number;
  todayLosses: number;
  todayNetPnl: number;
  disciplineScore: number;
  tradeResults: boolean[]; // today's closed trade results in order
}

export function computeDisciplineState(trades: Trade[], rules: DisciplineRule): DisciplineState {
  // Filter today's trades (all statuses)
  const todayAll = trades.filter(t => isToday(t.timestamp));
  // Closed trades only, sorted oldest → newest
  const todayClosed = todayAll
    .filter(t => t.status === TradeStatus.CLOSED)
    .sort((a, b) => a.timestamp - b.timestamp);

  const tradeResults = todayClosed.map(t => (t.pnl ?? 0) > 0);
  const { consLosses, consWins } = computeStreak(tradeResults);

  const todayWins   = tradeResults.filter(Boolean).length;
  const todayLosses = tradeResults.filter(r => !r).length;
  const todayNetPnl = todayClosed.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // --- Compute block state ---
  let isBlocked = false;
  let blockReason: string | null = null;

  if (consLosses >= rules.maxConsecutiveLosses) {
    isBlocked = true;
    blockReason = `consecutive_losses`;
  } else if (todayAll.length >= rules.maxTradesPerDay) {
    isBlocked = true;
    blockReason = `max_trades`;
  } else if (rules.maxDailyLossAmount > 0 && todayNetPnl <= -Math.abs(rules.maxDailyLossAmount)) {
    isBlocked = true;
    blockReason = `daily_loss_limit`;
  }

  // --- Win checkpoint ---
  const isProfitCheckpoint = !isBlocked && consWins >= rules.winCheckpointCount;

  // --- Discipline score (0–100) ---
  // Starts at 100, deductions:
  // -20 per consecutive loss beyond 1
  // -10 if daily loss limit hit
  // -5 for each trade beyond max (capped at -30)
  let score = 100;
  if (consLosses >= 2) score -= (consLosses - 1) * 20;
  if (rules.maxDailyLossAmount > 0 && todayNetPnl < 0) {
    const pct = Math.min(1, Math.abs(todayNetPnl) / rules.maxDailyLossAmount);
    score -= Math.round(pct * 20);
  }
  if (todayAll.length > rules.maxTradesPerDay) {
    score -= Math.min(30, (todayAll.length - rules.maxTradesPerDay) * 5);
  }
  score = Math.max(0, Math.min(100, score));

  return {
    rules,
    consecutiveLosses: consLosses,
    consecutiveWins: consWins,
    isBlocked,
    blockReason,
    isProfitCheckpoint,
    todayClosedCount: todayClosed.length,
    todayTotalCount: todayAll.length,
    todayWins,
    todayLosses,
    todayNetPnl,
    disciplineScore: score,
    tradeResults,
  };
}

/** Hook used inside React components */
export function useDiscipline(trades: Trade[]): DisciplineState & {
  updateRules: (newRules: DisciplineRule) => void;
} {
  const rules = useMemo(() => loadRules(), []);

  const state = useMemo(
    () => computeDisciplineState(trades, rules),
    [trades, rules]
  );

  const updateRules = useCallback((newRules: DisciplineRule) => {
    saveRules(newRules);
    // Trigger a re-render by reloading page (simple approach, no extra state needed)
    window.location.reload();
  }, []);

  return { ...state, updateRules };
}
