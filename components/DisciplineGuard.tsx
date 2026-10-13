import React, { useState } from 'react';
import { DisciplineState } from '../hooks/useDiscipline';
import { CapitalRiskState } from '../types';

interface Props {
  state: DisciplineState;
  capitalRisk: CapitalRiskState;
  onDismissBlock: () => void;
  onOverrideBlock: () => void;
  onStopTrading: () => void;
  onContinueTrading: () => void;
  onDismissCapitalRisk: () => void;
}

// ─── Loss Block Modal ─────────────────────────────────────────────────────────
const LossBlockModal: React.FC<{
  state: DisciplineState;
  onDismiss: () => void;
  onOverride: () => void;
}> = ({ state, onDismiss, onOverride }) => {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideText, setOverrideText] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const blockTitle =
    state.blockReason === 'consecutive_losses'
      ? `⛔ ${state.consecutiveLosses} Consecutive Losses`
      : state.blockReason === 'max_trades'
      ? '⛔ Daily Trade Limit Reached'
      : '⛔ Daily Loss Limit Hit';

  const blockMessage =
    state.blockReason === 'consecutive_losses'
      ? `You have lost ${state.consecutiveLosses} trades in a row. Your emotions are in control right now — NOT your strategy. Every extra trade from here will be revenge trading.`
      : state.blockReason === 'max_trades'
      ? `You've already taken ${state.todayTotalCount} trades today, which is your daily maximum. More trades = more risk of emotional decisions.`
      : `You've hit your daily loss limit. Continuing to trade now will only dig the hole deeper. Protect your capital.`;

  const dotColors = state.tradeResults.map((win, i) =>
    win ? 'bg-emerald-400' : 'bg-rose-500'
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Animated backdrop */}
      <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-md animate-pulse" style={{ animationDuration: '3s' }} />

      {/* Pulsing danger border */}
      <div className="absolute inset-0 pointer-events-none border-[3px] border-rose-500/60 animate-pulse" style={{ animationDuration: '1.5s' }} />

      <div className="relative w-full max-w-lg">
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-rose-500/20 rounded-3xl blur-2xl" />

        <div className="relative bg-gradient-to-b from-slate-900 to-rose-950/40 border-2 border-rose-500/50 rounded-3xl p-8 shadow-[0_0_60px_rgba(239,68,68,0.3)]">
          
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-3 bg-rose-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 bg-rose-500/20 border-2 border-rose-500/50 rounded-full flex items-center justify-center text-4xl">
                🛑
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-rose-400 mb-2 tracking-tight">
            {blockTitle}
          </h2>
          <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">
            {blockMessage}
          </p>

          {/* Trade streak visualization */}
          {state.tradeResults.length > 0 && (
            <div className="mb-6 bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Today's Trade Results</p>
              <div className="flex flex-wrap gap-2">
                {state.tradeResults.map((win, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      win
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                    }`}
                  >
                    {win ? '✓' : '✗'}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-[10px] text-emerald-400 font-bold">{state.todayWins} Wins</span>
                <span className="text-[10px] text-rose-400 font-bold">{state.todayLosses} Losses</span>
                <span className={`text-[10px] font-bold ${state.todayNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Net: {state.todayNetPnl >= 0 ? '+' : ''}{state.todayNetPnl.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Psychology tips */}
          <div className="mb-6 space-y-2">
            {[
              '🧘 Step away from the screen for 30 minutes',
              '📝 Journal how you\'re feeling right now',
              '🚶 Take a walk — movement resets your mind',
              '📵 Do NOT open another trading app',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {!overrideMode && !confirmed && (
            <>
              <button
                onClick={onDismiss}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-rose-600/30 text-sm uppercase tracking-widest mb-3"
              >
                I Understand — I Will Stop Trading
              </button>
              <button
                onClick={() => setOverrideMode(true)}
                className="w-full text-slate-600 hover:text-slate-500 text-[10px] font-bold py-2 transition-colors uppercase tracking-widest"
              >
                Override (Not recommended)
              </button>
            </>
          )}

          {overrideMode && !confirmed && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                <p className="text-amber-400 text-xs font-bold mb-1">⚠️ Override Warning</p>
                <p className="text-slate-400 text-xs">Type <span className="font-black text-white">I ACCEPT RISK</span> below to override. Remember: this is a rule you set to protect yourself.</p>
              </div>
              <input
                autoFocus
                value={overrideText}
                onChange={e => setOverrideText(e.target.value.toUpperCase())}
                placeholder="Type: I ACCEPT RISK"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-amber-500 transition-colors"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setOverrideMode(false); setOverrideText(''); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={overrideText !== 'I ACCEPT RISK'}
                  onClick={() => { setConfirmed(true); onOverride(); }}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-all"
                >
                  Override Block
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Capital Risk Block Modal ─────────────────────────────────────────────────────
const CapitalRiskBlockModal: React.FC<{
  capitalRisk: CapitalRiskState;
  onDismiss: () => void;
}> = ({ capitalRisk, onDismiss }) => {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideText, setOverrideText] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Animated backdrop */}
      <div className="absolute inset-0 bg-violet-950/80 backdrop-blur-md animate-pulse" style={{ animationDuration: '3s' }} />

      {/* Pulsing danger border */}
      <div className="absolute inset-0 pointer-events-none border-[3px] border-violet-500/60 animate-pulse" style={{ animationDuration: '1.5s' }} />

      <div className="relative w-full max-w-lg">
        {/* Glow */}
        <div className="absolute -inset-4 bg-violet-500/20 rounded-3xl blur-2xl" />

        <div className="relative bg-gradient-to-b from-slate-900 to-violet-950/40 border-2 border-violet-500/50 rounded-3xl p-8 shadow-[0_0_60px_rgba(139,92,246,0.3)]">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-3 bg-violet-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 bg-violet-500/20 border-2 border-violet-500/50 rounded-full flex items-center justify-center text-4xl">
                💸
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-violet-400 mb-2 tracking-tight">
            ⛔ Daily Capital Limit Hit!
          </h2>
          <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">
            You have lost <span className="text-rose-400 font-black">₹{capitalRisk.usedRisk.toFixed(0)}</span> today
            &nbsp;— that is your full <span className="text-violet-400 font-black">{capitalRisk.riskPercent}% daily limit</span>.
            Continuing to trade now is pure gambling. Your account cannot grow if you ignore this rule.
          </p>

          {/* Risk breakdown */}
          <div className="mb-6 bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Today's Capital Risk</p>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse" style={{ width: '100%' }} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[9px] text-slate-500 uppercase">Capital</p>
                <p className="text-sm font-black text-white">₹{capitalRisk.currentCapital.toFixed(0)}</p>
              </div>
              <div className="border-x border-slate-700/30">
                <p className="text-[9px] text-slate-500 uppercase">Limit ({capitalRisk.riskPercent}%)</p>
                <p className="text-sm font-black text-violet-400">₹{capitalRisk.dailyLimit.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase">Lost Today</p>
                <p className="text-sm font-black text-rose-400">₹{capitalRisk.usedRisk.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mb-6 space-y-2">
            {[
              '📵 Close all open positions immediately',
              '🧘 Step away from trading for the rest of the day',
              '📝 Journal: What caused today\'s losses?',
              '📊 Tomorrow your new limit auto-calculates from updated capital',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {!overrideMode && !confirmed && (
            <>
              <button
                onClick={onDismiss}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-violet-600/30 text-sm uppercase tracking-widest mb-3"
              >
                I Understand — I Will Stop Trading Today
              </button>
              <button
                onClick={() => setOverrideMode(true)}
                className="w-full text-slate-600 hover:text-slate-500 text-[10px] font-bold py-2 transition-colors uppercase tracking-widest"
              >
                Override (Not recommended — This is gambling)
              </button>
            </>
          )}

          {overrideMode && !confirmed && (
            <div className="space-y-4">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                <p className="text-rose-400 text-xs font-bold mb-1">⚠️ Last Warning</p>
                <p className="text-slate-400 text-xs">Type <span className="font-black text-white">I AM GAMBLING</span> to override. You set this limit to protect yourself.</p>
              </div>
              <input
                autoFocus
                value={overrideText}
                onChange={e => setOverrideText(e.target.value.toUpperCase())}
                placeholder="Type: I AM GAMBLING"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-rose-500 transition-colors"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setOverrideMode(false); setOverrideText(''); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={overrideText !== 'I AM GAMBLING'}
                  onClick={() => { setConfirmed(true); onDismiss(); }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-all"
                >
                  Override Limit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Win Checkpoint Modal ─────────────────────────────────────────────────────
const WinCheckpointModal: React.FC<{
  state: DisciplineState;
  onStop: () => void;
  onContinue: () => void;
}> = ({ state, onStop, onContinue }) => {
  const [confirmContinue, setConfirmContinue] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-amber-950/70 backdrop-blur-md" />

      <div className="relative w-full max-w-lg">
        <div className="absolute -inset-4 bg-amber-500/15 rounded-3xl blur-2xl" />

        <div className="relative bg-gradient-to-b from-slate-900 to-amber-950/30 border-2 border-amber-500/40 rounded-3xl p-8 shadow-[0_0_60px_rgba(245,158,11,0.25)]">
          
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-3 bg-amber-500/20 rounded-full blur-xl" />
              <div className="relative w-20 h-20 bg-amber-500/20 border-2 border-amber-500/50 rounded-full flex items-center justify-center text-4xl">
                🏆
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-amber-400 mb-2 tracking-tight">
            {state.consecutiveWins}-Win Streak!
          </h2>
          <p className="text-slate-300 text-center text-sm mb-2 font-medium">
            You're trading well today. This is your checkpoint.
          </p>
          <p className="text-slate-500 text-center text-xs mb-6 leading-relaxed">
            Discipline means knowing when to <span className="text-emerald-400 font-bold">stop while you're ahead</span>. Many traders give back gains by taking one too many trades when feeling confident.
          </p>

          {/* Today's results */}
          <div className="mb-6 bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Today's Session</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {state.tradeResults.map((win, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                    win
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  }`}
                >
                  {win ? '✓' : '✗'}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <div className="text-center">
                <p className="text-lg font-black text-emerald-400">{state.todayWins}</p>
                <p className="text-[9px] text-slate-500 uppercase">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-rose-400">{state.todayLosses}</p>
                <p className="text-[9px] text-slate-500 uppercase">Losses</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-black ${state.todayNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {state.todayNetPnl >= 0 ? '+' : ''}{state.todayNetPnl.toFixed(2)}
                </p>
                <p className="text-[9px] text-slate-500 uppercase">Net P&L</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-amber-400">{state.disciplineScore}</p>
                <p className="text-[9px] text-slate-500 uppercase">Score</p>
              </div>
            </div>
          </div>

          {!confirmContinue ? (
            <div className="space-y-3">
              <button
                onClick={onStop}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/30 text-sm uppercase tracking-widest"
              >
                ✅ Stop Here — Lock in My Gains
              </button>
              <button
                onClick={() => setConfirmContinue(true)}
                className="w-full bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-400 font-bold py-3.5 rounded-2xl transition-all text-sm"
              >
                Take One More Trade →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center">
                <p className="text-rose-400 text-sm font-bold mb-1">Are you sure?</p>
                <p className="text-slate-400 text-xs">Greed after winning is how traders blow accounts. Are you taking this trade based on your <span className="text-white font-bold">strategy</span> — or <span className="text-rose-400 font-bold">greed</span>?</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onStop}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-sm transition-all"
                >
                  Stop — Better Safe
                </button>
                <button
                  onClick={onContinue}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-sm transition-all"
                >
                  Continue Trading
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Guard Component ─────────────────────────────────────────────────────
const DisciplineGuard: React.FC<Props> = ({
  state,
  capitalRisk,
  onDismissBlock,
  onOverrideBlock,
  onStopTrading,
  onContinueTrading,
  onDismissCapitalRisk,
}) => {
  // Capital risk breach — highest priority
  if (capitalRisk.enabled && capitalRisk.isBreached) {
    return (
      <CapitalRiskBlockModal
        capitalRisk={capitalRisk}
        onDismiss={onDismissCapitalRisk}
      />
    );
  }

  if (state.isBlocked) {
    return (
      <LossBlockModal
        state={state}
        onDismiss={onDismissBlock}
        onOverride={onOverrideBlock}
      />
    );
  }

  if (state.isProfitCheckpoint) {
    return (
      <WinCheckpointModal
        state={state}
        onStop={onStopTrading}
        onContinue={onContinueTrading}
      />
    );
  }

  return null;
};

export default DisciplineGuard;
