import React, { useState, useMemo } from 'react';
import { Trade, DisciplineRule } from '../types';
import {
  loadRules,
  saveRules,
  loadLogs,
  saveLogs,
  computeDisciplineState,
  DEFAULT_RULES,
} from '../hooks/useDiscipline';

interface Props {
  trades: Trade[];
}

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
    suffix = ''
  ) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-700/30 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
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
        {field('Max Daily Loss (₹/$)', 'maxDailyLossAmount', 'Set to 0 to disable. Blocks trading if net loss exceeds this.', 0, 100000)}
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
const DisciplinePage: React.FC<Props> = ({ trades }) => {
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
