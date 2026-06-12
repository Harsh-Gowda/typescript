import React from 'react';
import { DisciplineState } from '../hooks/useDiscipline';
import { useNavigate } from 'react-router-dom';

interface Props {
  state: DisciplineState;
}

const DisciplineStatus: React.FC<Props> = ({ state }) => {
  const navigate = useNavigate();

  const {
    consecutiveLosses,
    consecutiveWins,
    isBlocked,
    todayWins,
    todayLosses,
    todayTotalCount,
    todayNetPnl,
    disciplineScore,
    rules,
    tradeResults,
  } = state;

  // Score color
  const scoreColor =
    disciplineScore >= 80
      ? 'text-emerald-400'
      : disciplineScore >= 50
      ? 'text-amber-400'
      : 'text-rose-400';

  const scoreBg =
    disciplineScore >= 80
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : disciplineScore >= 50
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-rose-500/10 border-rose-500/20';

  // Streak display
  const hasStreak = consecutiveLosses > 0 || consecutiveWins > 0;
  const streakLabel =
    consecutiveLosses > 0
      ? `${consecutiveLosses} Loss Streak`
      : `${consecutiveWins} Win Streak`;
  const streakColor =
    consecutiveLosses > 0
      ? consecutiveLosses >= rules.maxConsecutiveLosses - 1
        ? 'text-rose-400'
        : 'text-amber-400'
      : 'text-emerald-400';
  const streakBg =
    consecutiveLosses > 0
      ? consecutiveLosses >= rules.maxConsecutiveLosses - 1
        ? 'bg-rose-500/10 border-rose-500/20'
        : 'bg-amber-500/10 border-amber-500/20'
      : 'bg-emerald-500/10 border-emerald-500/20';

  // Loss bar fill (0-100)
  const lossBarFill = Math.min(100, (consecutiveLosses / rules.maxConsecutiveLosses) * 100);
  const tradeBarFill = Math.min(100, (todayTotalCount / rules.maxTradesPerDay) * 100);

  return (
    <div
      onClick={() => navigate('/discipline')}
      className="cursor-pointer bg-gradient-to-r from-slate-900/60 to-slate-800/40 border border-slate-700/40 rounded-2xl p-4 backdrop-blur-xl hover:border-indigo-500/30 transition-all duration-300 group"
    >
      <div className="flex flex-wrap items-center gap-3">

        {/* Discipline Shield Icon */}
        <div className="flex items-center gap-2.5 mr-1">
          <div className={`p-2 rounded-xl border ${scoreBg} transition-all`}>
            <svg className={`w-4 h-4 ${scoreColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Discipline</p>
            <p className={`text-sm font-black ${scoreColor}`}>{disciplineScore}/100</p>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-700/50" />

        {/* Today's stats */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trades</p>
            <p className="text-sm font-black text-white">
              {todayTotalCount}
              <span className="text-slate-600 text-[9px]">/{rules.maxTradesPerDay}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">W / L</p>
            <p className="text-sm font-black">
              <span className="text-emerald-400">{todayWins}</span>
              <span className="text-slate-600"> / </span>
              <span className="text-rose-400">{todayLosses}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Session P&L</p>
            <p className={`text-sm font-black ${todayNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {todayNetPnl >= 0 ? '+' : ''}{todayNetPnl.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-700/50" />

        {/* Streak indicator */}
        {hasStreak && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${streakBg} transition-all`}>
            <span className="text-base">
              {consecutiveLosses > 0 ? (consecutiveLosses >= rules.maxConsecutiveLosses ? '🛑' : '⚠️') : '🔥'}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wide ${streakColor}`}>
              {streakLabel}
            </span>
          </div>
        )}

        {/* Trade dots (last 5) */}
        {tradeResults.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            {tradeResults.slice(-5).map((win, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                  win
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {win ? '✓' : '✗'}
              </div>
            ))}
          </div>
        )}

        {/* Blocked badge */}
        {isBlocked && (
          <div className="ml-auto flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-xl animate-pulse">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-wide">BLOCKED</span>
          </div>
        )}

        {/* Progress bars (small) */}
        <div className="hidden lg:flex items-center gap-2 ml-2">
          {/* Loss streak bar */}
          <div className="w-20">
            <p className="text-[8px] text-slate-600 uppercase tracking-widest mb-1">Loss Streak</p>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  lossBarFill >= 100 ? 'bg-rose-500 animate-pulse' : lossBarFill >= 67 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${lossBarFill}%` }}
              />
            </div>
          </div>
          {/* Trade count bar */}
          <div className="w-20">
            <p className="text-[8px] text-slate-600 uppercase tracking-widest mb-1">Trades Used</p>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tradeBarFill >= 100 ? 'bg-rose-500' : tradeBarFill >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${tradeBarFill}%` }}
              />
            </div>
          </div>
        </div>

        {/* Arrow hint */}
        <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

      </div>
    </div>
  );
};

export default DisciplineStatus;
