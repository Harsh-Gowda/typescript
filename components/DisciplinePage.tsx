import React, { useState, useMemo } from 'react';
import { Trade, DisciplineRule, CapitalRiskConfig } from '../types';
import {
  loadRules,
  saveRules,
  loadLogs,
  saveLogs,
  computeDisciplineState,
  DEFAULT_RULES,
  loadCapitalRisk,
  saveCapitalRisk,
  rollCapitalForward,
  computeCapitalRiskState,
  DEFAULT_CAPITAL_RISK,
} from '../hooks/useDiscipline';

interface Props {
  trades: Trade[];
  totalOptionNetPnl: number;
}

// ─── Capital Risk Control Panel ──────────────────────────────────────────────────
const RISK_PERCENTS = [5, 10, 15, 20, 25];

const CapitalRiskPanel: React.FC<{
  trades: Trade[];
  todayNetPnl: number;
  totalOptionNetPnl: number;
}> = ({ trades, todayNetPnl, totalOptionNetPnl }) => {
  const [cfg, setCfg] = useState<CapitalRiskConfig>(() => {
    const loaded = loadCapitalRisk();
    return rollCapitalForward(loaded, trades);
  });
  const [saved, setSaved] = useState(false);

  // ── Live capital = startingCapital + ALL cumulative option P&L ──
  // This auto-grows/shrinks as trades close, no manual typing needed
  const liveCapital = Math.max(0, (cfg.startingCapital || 0) + totalOptionNetPnl);
  // capitalInput is now read-only display (no manual override)
  const [capitalInput, setCapitalInput] = useState(String(cfg.startingCapital));

  // Recompute risk state LIVE from capitalInput + selected riskPercent
  const riskState = useMemo(
    () => computeCapitalRiskState(
      { ...cfg, currentCapital: liveCapital },
      todayNetPnl
    ),
    [cfg, liveCapital, todayNetPnl]
  );

  const handleSave = () => {
    // Save startingCapital from the input; liveCapital will auto-derive from P&L
    const startingVal = Math.max(0, Number(capitalInput) || 0);
    const updated: CapitalRiskConfig = {
      ...cfg,
      startingCapital: startingVal,
      // currentCapital stored = startingCapital (liveCapital computed on render)
      currentCapital: startingVal,
      lastUpdatedDate: new Date().toISOString().slice(0, 10),
    };
    saveCapitalRisk(updated);
    setCfg(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleEnabled = () => {
    const updated = { ...cfg, enabled: !cfg.enabled };
    saveCapitalRisk(updated);
    setCfg(updated);
  };

  const changePercent = (p: number) => {
    const updated = { ...cfg, riskPercent: p };
    saveCapitalRisk(updated);
    setCfg(updated);
  };

  // Bar color based on live risk state
  const barColor =
    riskState.alertLevel === 'breached' ? 'bg-rose-500'
    : riskState.alertLevel === 'danger'  ? 'bg-orange-500'
    : riskState.alertLevel === 'warning' ? 'bg-amber-400'
    : 'bg-emerald-500';

  const barGlow =
    riskState.alertLevel === 'breached' ? 'shadow-rose-500/50'
    : riskState.alertLevel === 'danger'  ? 'shadow-orange-500/40'
    : riskState.alertLevel === 'warning' ? 'shadow-amber-400/30'
    : 'shadow-emerald-500/20';

  // Tomorrow's capital also uses live typed capital
  const tomorrowCapital = liveCapital + todayNetPnl;


  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-3xl p-6 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-black text-white">Capital Risk Control</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Prop firm style daily limit</p>
          </div>
        </div>
        {/* Enable toggle */}
        <button
          onClick={toggleEnabled}
          className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
            cfg.enabled ? 'bg-violet-600' : 'bg-slate-700'
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
            cfg.enabled ? 'left-6' : 'left-0.5'
          }`} />
        </button>
      </div>

      {!cfg.enabled && (
        <div className="text-center py-8 border border-dashed border-slate-700/40 rounded-2xl">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="text-slate-400 text-sm font-bold">Capital Risk Control is OFF</p>
          <p className="text-slate-600 text-xs mt-1">Toggle the switch above to activate prop-firm style daily limits.</p>
        </div>
      )}

      {cfg.enabled && (
        <div className="space-y-6">
          {/* Live Risk Meter */}
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/30">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Today's Risk Meter</p>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                riskState.alertLevel === 'breached' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse'
                : riskState.alertLevel === 'danger'  ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                : riskState.alertLevel === 'warning' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              }`}>
                {riskState.alertLevel === 'breached' ? '⛔ LIMIT HIT'
                  : riskState.alertLevel === 'danger'  ? '🔴 DANGER'
                  : riskState.alertLevel === 'warning' ? '🟡 WARNING'
                  : '🟢 SAFE'}
              </span>
            </div>

            {/* Bar */}
            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-700 shadow-lg ${barColor} ${barGlow}`}
                style={{ width: `${Math.min(100, riskState.usedPercent)}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Used</p>
                <p className="text-sm font-black text-rose-400">₹{riskState.usedRisk.toFixed(0)}</p>
                <p className="text-[9px] text-slate-600">{riskState.usedPercent.toFixed(1)}%</p>
              </div>
              <div className="text-center border-x border-slate-700/30">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Daily Limit</p>
                <p className="text-sm font-black text-white">₹{riskState.dailyLimit.toFixed(0)}</p>
                <p className="text-[9px] text-slate-600">{cfg.riskPercent}% of capital</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Remaining</p>
                <p className={`text-sm font-black ${riskState.remainingRisk > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{riskState.remainingRisk.toFixed(0)}
                </p>
                <p className="text-[9px] text-slate-600">{(100 - Math.min(100, riskState.usedPercent)).toFixed(1)}% left</p>
              </div>
            </div>

            {/* Alert messages */}
            {riskState.alertLevel === 'breached' && (
              <div className="mt-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-center animate-pulse">
                <p className="text-rose-400 text-xs font-black">⛔ Daily Capital Limit Breached!</p>
                <p className="text-slate-400 text-[10px] mt-1">You have lost {cfg.riskPercent}% of your capital today. Stop trading to protect your account.</p>
              </div>
            )}
            {riskState.alertLevel === 'danger' && (
              <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-center">
                <p className="text-orange-400 text-xs font-black">🔴 75%+ of limit used — Extreme caution!</p>
                <p className="text-slate-400 text-[10px] mt-1">Only ₹{riskState.remainingRisk.toFixed(0)} left before limit. Consider stopping for the day.</p>
              </div>
            )}
            {riskState.alertLevel === 'warning' && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                <p className="text-amber-400 text-xs font-black">🟡 Half your limit used — Slow down</p>
                <p className="text-slate-400 text-[10px] mt-1">₹{riskState.remainingRisk.toFixed(0)} remaining. Trade carefully.</p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            {/* Current Capital */}
            <div>
              <label className="text-xs font-black text-slate-300 block mb-2">Starting Capital (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  value={capitalInput}
                  onChange={e => setCapitalInput(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-8 pr-4 py-3 text-white font-black outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
                  placeholder="e.g. 20000"
                />
              </div>
              {/* Live capital display — auto-computed from starting + all P&L */}
              <div className="mt-2 bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Account Value</p>
                  <p className={`text-base font-black mt-0.5 ${
                    liveCapital >= (cfg.startingCapital || 0) ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    ₹{liveCapital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">All-time Options P&L</p>
                  <p className={`text-sm font-black mt-0.5 ${
                    totalOptionNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {totalOptionNetPnl >= 0 ? '+' : ''}₹{totalOptionNetPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-violet-400/70 mt-1 font-bold">
                Today's limit = ₹{riskState.dailyLimit.toFixed(0)} &nbsp;({cfg.riskPercent}% of ₹{liveCapital.toFixed(0)})
              </p>
            </div>

            {/* Risk Percent */}
            <div>
              <label className="text-xs font-black text-slate-300 block mb-2">Daily Risk %</label>
              <div className="flex gap-2">
                {RISK_PERCENTS.map(p => (
                  <button
                    key={p}
                    onClick={() => changePercent(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                      cfg.riskPercent === p
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/50'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700/30">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Tomorrow's Projected Capital</p>
              <div className="flex items-center justify-between">
                <p className={`text-base font-black ${
                  tomorrowCapital >= liveCapital ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  ₹{Math.max(0, tomorrowCapital).toFixed(0)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {todayNetPnl >= 0 ? '+' : ''}{todayNetPnl.toFixed(0)} today's P&L
                </p>
              </div>
              <p className="text-[9px] text-slate-600 mt-1">
                Next day limit = ₹{(Math.max(0, tomorrowCapital) * cfg.riskPercent / 100).toFixed(0)} ({cfg.riskPercent}%)
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 ${
              saved
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20'
            }`}
          >
            {saved ? '✓ Saved!' : 'Save Starting Capital'}
          </button>
        </div>
      )}
    </div>
  );
};

const psychTips = [
  {
    emoji: '🛑',
    color: 'rose',
    title: 'After a Loss — The Danger Zone',
    tips: [
      'Close your charts for at least 30 minutes.',
      'Do NOT open a new position to "recover" losses.',
      'Write in this journal: what went wrong and why.',
      'Breathe deeply. Your next trade does not exist yet.',
    ],
  },
  {
    emoji: '💰',
    color: 'amber',
    title: 'After a Win — Greed Trap',
    tips: [
      'A win does not mean the market owes you more.',
      'Same risk rules apply — never increase size after a win.',
      'Log the trade, take a break, then re-evaluate.',
      'Ask: "Am I trading my plan or my ego?"',
    ],
  },
  {
    emoji: '🔥',
    color: 'orange',
    title: 'Feeling Overconfident',
    tips: [
      'Overconfidence kills more accounts than bad strategy.',
      'Close the app. Come back tomorrow with fresh eyes.',
      'Review your rules. Did you follow every single one?',
      'Reduce your size by 50% if you feel "on fire".',
    ],
  },
  {
    emoji: '😤',
    color: 'purple',
    title: 'Revenge Trading Warning',
    tips: [
      'If you feel angry after a loss — you are already in a bad trade.',
      'Revenge trades have 0% edge. They are pure emotion.',
      'The market does not know or care about your loss.',
      'Log your emotion RIGHT NOW in the journal before anything else.',
    ],
  },
  {
    emoji: '🧘',
    color: 'indigo',
    title: 'Before Every Trade',
    tips: [
      'Ask: "Is this in my trading plan?" — If no, skip it.',
      'Check your emotion: Greed? Fear? Neutral? Only enter neutral.',
      'Confirm your stop loss BEFORE your entry.',
      'Set your target. Then do NOT move it after entry.',
    ],
  },
  {
    emoji: '📵',
    color: 'slate',
    title: 'End of Day Ritual',
    tips: [
      'Close all positions or set hard stop losses.',
      'Review every trade — not just the P&L, the process.',
      'Rate your discipline today from 1–10.',
      'Disconnect from all trading apps for the rest of the evening.',
    ],
  },
];

const colorMap: Record<string, string> = {
  rose:   'bg-rose-500/10 border-rose-500/20 text-rose-400',
  amber:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
  orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  slate:  'bg-slate-500/10 border-slate-500/20 text-slate-400',
};
const dotMap: Record<string, string> = {
  rose:   'bg-rose-500',
  amber:  'bg-amber-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  slate:  'bg-slate-500',
};

// ─── Rule Editor ─────────────────────────────────────────────────────────────
const RuleEditor: React.FC<{ onSave: (r: DisciplineRule) => void }> = ({ onSave }) => {
  const [rules, setRules] = useState<DisciplineRule>(loadRules());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveRules(rules);
    onSave(rules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (
    label: string,
    key: keyof DisciplineRule,
    description: string,
    min: number,
    max: number,
    suffix = '',
    isInput = false
  ) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-700/30 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {isInput ? (
          <div className="relative flex items-center">
            <input
              type="number"
              min={min}
              max={max}
              value={rules[key]}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRules(r => ({ ...r, [key]: val }));
              }}
              onBlur={(e) => {
                let val = Number(e.target.value);
                if (val < min) val = min;
                if (val > max) val = max;
                setRules(r => ({ ...r, [key]: val }));
              }}
              className="w-24 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-white font-black outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center"
            />
            {suffix && <span className="absolute right-3 text-slate-400 font-bold">{suffix}</span>}
          </div>
        ) : (
          <>
            <button
              onClick={() => setRules(r => ({ ...r, [key]: Math.max(min, Number(r[key]) - 1) }))}
              className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black transition-all flex items-center justify-center"
            >−</button>
            <span className="text-xl font-black text-white w-12 text-center">
              {rules[key]}{suffix}
            </span>
            <button
              onClick={() => setRules(r => ({ ...r, [key]: Math.min(max, Number(r[key]) + 1) }))}
              className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black transition-all flex items-center justify-center"
            >+</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-3xl p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-black text-white">Your Discipline Rules</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Customize your limits</p>
          </div>
        </div>
        <button
          onClick={() => setRules({ ...DEFAULT_RULES })}
          className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
        >
          Reset
        </button>
      </div>

      <div>
        {field('Max Consecutive Losses', 'maxConsecutiveLosses', 'Trading will be blocked after this many losses in a row.', 1, 10)}
        {field('Win Streak Checkpoint', 'winCheckpointCount', 'A checkpoint appears after this many consecutive wins.', 1, 10)}
        {field('Max Trades Per Day', 'maxTradesPerDay', 'No new trades allowed beyond this daily limit.', 1, 30)}
        {field('Max Daily Loss (₹/$)', 'maxDailyLossAmount', 'Set to 0 to disable. Blocks trading if net loss exceeds this.', 0, 100000, '', true)}
      </div>

      <button
        onClick={handleSave}
        className={`mt-6 w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 ${
          saved
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
        }`}
      >
        {saved ? '✓ Rules Saved!' : 'Save Rules'}
      </button>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const DisciplinePage: React.FC<Props> = ({ trades, totalOptionNetPnl }) => {
  const [rules, setRules] = useState<DisciplineRule>(loadRules());

  const state = useMemo(
    () => computeDisciplineState(trades, rules),
    [trades, rules]
  );

  const logs = useMemo(() => {
    const existing = loadLogs();
    return existing.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  }, []);

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = (s: number) =>
    s >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : s >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Discipline Center</h2>
          <p className="text-slate-500 text-xs mt-1 font-medium tracking-wide uppercase">Your rules. Your guard. Your capital.</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl border ${scoreBg(state.disciplineScore)} flex items-center gap-2`}>
          <span className="text-xl">🛡️</span>
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Score</p>
            <p className={`text-xl font-black ${scoreColor(state.disciplineScore)}`}>{state.disciplineScore}</p>
          </div>
        </div>
      </div>

      {/* ── Today's Session Summary ── */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-3xl p-6 backdrop-blur-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5">Today's Session</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Trades', value: state.todayTotalCount, suffix: `/${rules.maxTradesPerDay}`, color: 'text-white' },
            { label: 'Wins', value: state.todayWins, suffix: '', color: 'text-emerald-400' },
            { label: 'Losses', value: state.todayLosses, suffix: '', color: 'text-rose-400' },
            {
              label: 'Net P&L',
              value: (state.todayNetPnl >= 0 ? '+' : '') + state.todayNetPnl.toFixed(2),
              suffix: '',
              color: state.todayNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
            },
          ].map(({ label, value, suffix, color }) => (
            <div key={label} className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/30 text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}<span className="text-slate-600 text-sm">{suffix}</span></p>
            </div>
          ))}
        </div>

        {/* Trade result dots */}
        {state.tradeResults.length > 0 ? (
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Trade History (Today)</p>
            <div className="flex flex-wrap gap-2">
              {state.tradeResults.map((win, i) => (
                <div
                  key={i}
                  title={`Trade ${i + 1}: ${win ? 'Win ✓' : 'Loss ✗'}`}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border transition-all hover:scale-110 ${
                    win
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  }`}
                >
                  {win ? '✓' : '✗'}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-600 text-sm">No trades closed today yet.</p>
            <p className="text-slate-700 text-xs mt-1">Your trade results will appear here as dots.</p>
          </div>
        )}

        {/* Status pill */}
        <div className="mt-5 flex items-center gap-3">
          {state.isBlocked ? (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl animate-pulse">
              <span className="w-2 h-2 bg-rose-500 rounded-full" />
              <span className="text-xs font-black text-rose-400 uppercase tracking-widest">Trading Blocked</span>
            </div>
          ) : state.isProfitCheckpoint ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
              <span>🏆</span>
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Win Checkpoint Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Active — Trading Allowed</span>
            </div>
          )}

          {state.consecutiveLosses > 0 && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl">
              <span className="text-xs font-black text-rose-400">
                ⚠️ {state.consecutiveLosses}/{rules.maxConsecutiveLosses} Loss Streak
              </span>
            </div>
          )}
          {state.consecutiveWins > 0 && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl">
              <span className="text-xs font-black text-emerald-400">
                🔥 {state.consecutiveWins} Win Streak
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Rules + Tips grid ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RuleEditor onSave={setRules} />

        {/* Quick discipline checklist */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-white">Pre-Trade Checklist</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Before every single trade</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { q: 'Is this trade in my written plan?', icon: '📋' },
              { q: 'Am I entering from a neutral emotional state?', icon: '🧘' },
              { q: 'Do I have a clear stop loss set before entering?', icon: '🛡️' },
              { q: 'Is my risk less than 1-2% of my account?', icon: '💰' },
              { q: 'Am I trading to recover from a loss?', icon: '⚠️', warn: true },
              { q: 'Am I overtrading today (too many trades)?', icon: '📊', warn: true },
              { q: 'Have I logged my last trade before entering this one?', icon: '📝' },
            ].map(({ q, icon, warn }) => (
              <div key={q} className={`flex items-start gap-3 p-3 rounded-xl border ${warn ? 'bg-rose-500/5 border-rose-500/10' : 'bg-slate-800/30 border-slate-700/20'}`}>
                <span className="text-base mt-0.5">{icon}</span>
                <p className={`text-xs font-medium ${warn ? 'text-rose-300' : 'text-slate-300'}`}>{q}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Capital Risk Control ── */}
      <CapitalRiskPanel trades={trades} todayNetPnl={state.todayNetPnl} totalOptionNetPnl={totalOptionNetPnl} />

      {/* ── Psychology Tips ── */}
      <div>
        <div className="mb-5">
          <h3 className="text-lg font-black text-white">Psychology & Emotion Control</h3>
          <p className="text-slate-500 text-xs mt-1">Read these whenever you feel the urge to override your rules.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {psychTips.map(({ emoji, color, title, tips }) => (
            <div
              key={title}
              className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/30 rounded-2xl p-5 backdrop-blur-xl hover:border-slate-600/50 transition-all duration-300 group"
            >
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${colorMap[color]} mb-4`}>
                <span>{emoji}</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{title}</span>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className={`w-1.5 h-1.5 ${dotMap[color]} rounded-full mt-1.5 flex-shrink-0`} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Discipline History Log ── */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-white">Discipline History</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Last 14 days</p>
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-slate-500 text-sm">No history yet.</p>
            <p className="text-slate-600 text-xs mt-1">Your daily discipline logs will appear here after you close trades.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-700/30">
                  <th className="text-left py-2 pb-3 font-black">Date</th>
                  <th className="text-center py-2 pb-3 font-black">Trades</th>
                  <th className="text-center py-2 pb-3 font-black">W/L</th>
                  <th className="text-center py-2 pb-3 font-black">Max Loss Streak</th>
                  <th className="text-center py-2 pb-3 font-black">Net P&L</th>
                  <th className="text-center py-2 pb-3 font-black">Score</th>
                  <th className="text-left py-2 pb-3 font-black">Violations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/20">
                {logs.map((log) => (
                  <tr key={log.date} className="hover:bg-slate-700/10 transition-colors">
                    <td className="py-3 text-slate-300 font-bold">{log.date}</td>
                    <td className="py-3 text-center text-white font-bold">{log.totalTrades}</td>
                    <td className="py-3 text-center">
                      <span className="text-emerald-400 font-bold">{log.wins}</span>
                      <span className="text-slate-600"> / </span>
                      <span className="text-rose-400 font-bold">{log.losses}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`font-black ${log.maxLossStreak >= 2 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {log.maxLossStreak}
                      </span>
                    </td>
                    <td className={`py-3 text-center font-black ${log.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {log.netPnl >= 0 ? '+' : ''}{log.netPnl.toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg font-black text-[10px] ${
                        log.disciplineScore >= 80
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : log.disciplineScore >= 50
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {log.disciplineScore}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {log.ruleViolations.length === 0
                        ? <span className="text-emerald-400/60 text-[10px]">✓ None</span>
                        : log.ruleViolations.map((v, i) => (
                          <span key={i} className="text-rose-400/80 text-[10px] mr-1">{v}</span>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisciplinePage;
