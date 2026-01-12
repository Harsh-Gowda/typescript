
import React, { useState } from 'react';
import { Emotion, Trade, Currency } from '../types';

interface Props {
  onSubmit: (trade: Omit<Trade, 'id' | 'timestamp' | 'status'>) => void;
  onCancel: () => void;
  defaultCurrency: Currency;
}

const TradeForm: React.FC<Props> = ({ onSubmit, onCancel, defaultCurrency }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'Long' as 'Long' | 'Short',
    entryPrice: 0,
    stopLoss: 0,
    target: 0,
    entryEmotion: Emotion.CONFIDENT,
    notes: '',
    currency: defaultCurrency
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const currencySymbol = formData.currency === 'USD' ? '$' : '₹';

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-6">
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
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          Execute Log
        </button>
      </div>
    </form>
  );
};

export default TradeForm;
