import React from 'react';
import { Trade, TradeStatus, Emotion, Currency } from '../types';

interface EditTradeModalProps {
  trade: Trade;
  onSave: (updatedTrade: Trade) => void;
  onCancel: () => void;
  onChange: (updatedTrade: Trade) => void;
}

const EditTradeModal: React.FC<EditTradeModalProps> = ({ trade, onSave, onCancel, onChange }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(trade);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Edit Record</h3>
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
            {(['USD', 'INR'] as Currency[]).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onChange({ ...trade, currency: curr })}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${trade.currency === curr ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Symbol</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
              value={trade.symbol}
              onChange={e => onChange({ ...trade, symbol: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Currency</label>
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-400">{trade.currency} Position</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Trade Date & Time</label>
            <input 
              type="datetime-local"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              value={new Date(trade.timestamp - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
              onChange={e => onChange({ ...trade, timestamp: new Date(e.target.value).getTime() })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Entry Price ({trade.currency === 'USD' ? '$' : '₹'})</label>
            <input
              type="number" step="any"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
              value={trade.entryPrice}
              onChange={e => onChange({ ...trade, entryPrice: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
              value={trade.status}
              onChange={e => onChange({ ...trade, status: e.target.value as TradeStatus })}
            >
              <option value={TradeStatus.OPEN}>Open</option>
              <option value={TradeStatus.CLOSED}>Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Direction</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
              value={trade.type}
              onChange={e => onChange({ ...trade, type: e.target.value as 'Long' | 'Short' })}
            >
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Stop Loss ({trade.currency === 'USD' ? '$' : '₹'})</label>
            <input
              type="number" step="any"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
              value={trade.stopLoss || ''}
              onChange={e => onChange({ ...trade, stopLoss: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target ({trade.currency === 'USD' ? '$' : '₹'})</label>
            <input
              type="number" step="any"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
              value={trade.target || ''}
              onChange={e => onChange({ ...trade, target: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Entry Psychology</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
              value={trade.entryEmotion}
              onChange={e => onChange({ ...trade, entryEmotion: e.target.value as Emotion })}
            >
              {Object.values(Emotion).map(emo => <option key={emo} value={emo}>{emo}</option>)}
            </select>
          </div>
          {trade.status === TradeStatus.CLOSED && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Exit Price ({trade.currency === 'USD' ? '$' : '₹'})</label>
                <input
                  type="number" step="any"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
                  value={trade.exitPrice || 0}
                  onChange={e => onChange({ ...trade, exitPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">PnL Amount ({trade.currency === 'USD' ? '$' : '₹'})</label>
                <input
                  type="number" step="any"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
                  value={trade.pnl || 0}
                  onChange={e => onChange({ ...trade, pnl: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Exit Psychology</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-xs focus:border-indigo-500 transition-colors"
                  value={trade.exitEmotion || Emotion.NEUTRAL}
                  onChange={e => onChange({ ...trade, exitEmotion: e.target.value as Emotion })}
                >
                  {Object.values(Emotion).map(emo => <option key={emo} value={emo}>{emo}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Trade Logic & Confluence</label>
          <textarea
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
            value={trade.notes || ''}
            onChange={e => onChange({ ...trade, notes: e.target.value })}
          />
        </div>

        <div className="flex gap-3 mt-8">
          <button type="button" onClick={onCancel} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all">Cancel</button>
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">Save Changes</button>
        </div>
      </form>
    </div>
  );
};

export default EditTradeModal;
