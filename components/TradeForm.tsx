
import React, { useState } from 'react';
import { Emotion, Trade, Currency } from '../types';
import { DisciplineState } from '../hooks/useDiscipline';
import { useNavigate } from 'react-router-dom';

interface Props {
  onSubmit: (trade: Omit<Trade, 'id' | 'status'>) => void;
  onCancel: () => void;
  defaultCurrency: Currency;
  disciplineState?: DisciplineState;
}

const TradeForm: React.FC<Props> = ({ onSubmit, onCancel, defaultCurrency, disciplineState }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'Long' as 'Long' | 'Short',
    entryPrice: 0,
    stopLoss: 0,
    target: 0,
    entryEmotion: Emotion.CONFIDENT,
    notes: '',
    currency: defaultCurrency,
    timestamp: Date.now()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disciplineState?.isBlocked) return; // hard guard
    onSubmit(formData);
  };

  const currencySymbol = formData.currency === 'USD' ? '$' : '₹';

  // ── Block banner when trading is locked ──────────────────────────────────
  const blockMessages: Record<string, { title: string; body: string }> = {
    consecutive_losses: {
      title: `🛑 Trading Blocked — ${disciplineState?.consecutiveLosses} Consecutive Losses`,
      body: `You've hit your consecutive loss limit (${disciplineState?.rules.maxConsecutiveLosses}). Trading is locked to protect your capital. Take a break, review your trades, and come back tomorrow.`,
    },
    max_trades: {
      title: `🛑 Daily Trade Limit Reached`,
      body: `You've taken ${disciplineState?.todayTotalCount} trades today (your limit: ${disciplineState?.rules.maxTradesPerDay}). No more entries allowed for today. Close the app and rest.`,
    },
    daily_loss_limit: {
      title: `🛑 Daily Loss Limit Hit`,
      body: `Your net P&L has exceeded your daily loss limit. Further trading today is blocked. Come back tomorrow with a fresh mindset.`,
    },
  };

  const blockInfo = disciplineState?.isBlocked && disciplineState.blockReason
    ? blockMessages[disciplineState.blockReason]
    : null;

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-6">
      {/* ── Block Banner ── */}
      {blockInfo && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/50 bg-rose-950/40 p-5">
          <div className="absolute inset-0 bg-rose-500/5 animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="relative">
            <p className="text-rose-400 font-black text-base mb-1">{blockInfo.title}</p>
            <p className="text-rose-200/70 text-sm leading-relaxed">{blockInfo.body}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/discipline')}
                className="flex-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                View Discipline Center
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-white">New Position</h2>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
          {(['USD', 'INR'] as Currency[]).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setFormData({ ...formData, currency: curr })}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                formData.currency === curr 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Asset Symbol</label>
          <input 
            required
            placeholder="e.g. BTCUSDT"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
            value={formData.symbol}
            onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Direction</label>
          <select 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as 'Long' | 'Short' })}
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Trade Date & Time</label>
        <input 
          type="datetime-local"
          required
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white text-sm"
          value={new Date(formData.timestamp - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
          onChange={e => setFormData({ ...formData, timestamp: new Date(e.target.value).getTime() })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Entry ({currencySymbol})</label>
          <input 
            type="number" step="any" required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
            value={formData.entryPrice || ''}
            onChange={e => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Stop Loss ({currencySymbol})</label>
          <input 
            type="number" step="any" required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white font-mono"
            value={formData.stopLoss || ''}
            onChange={e => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Target ({currencySymbol})</label>
          <input 
            type="number" step="any" required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white font-mono"
            value={formData.target || ''}
            onChange={e => setFormData({ ...formData, target: parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1 font-bold tracking-tighter uppercase text-[10px]">Initial Psychology</label>
        <div className="flex flex-wrap gap-2">
          {Object.values(Emotion).map(emo => (
            <button
              key={emo}
              type="button"
              onClick={() => setFormData({ ...formData, entryEmotion: emo })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                formData.entryEmotion === emo ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {emo}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Trade Logic & Confluence</label>
        <textarea 
          rows={3}
          placeholder="Support level bounce, 1H EMA rejection..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white text-sm"
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button 
          type="submit"
          disabled={!!disciplineState?.isBlocked}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          {disciplineState?.isBlocked ? '⛔ Trading Locked' : 'Execute Log'}
        </button>
      </div>
    </form>
  );
};

export default TradeForm;
