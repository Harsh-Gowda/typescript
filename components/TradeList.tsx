
import React, { useState } from 'react';
import { Trade, TradeStatus, Emotion, Currency } from '../types';

interface Props {
  trades: Trade[];
  displayCurrency: Currency;
  onCloseTrade: (id: string, exitPrice: number, exitEmotion: Emotion, manualPnL?: number) => void;
  onDeleteTrade: (id: string) => void;
  onUpdateTrade: (trade: Trade) => void;
}

const CONVERSION_RATE = 83.5;
const convert = (value: number | undefined, from: Currency, to: Currency) => {
  if (!value) return 0;
  if (from === to) return value;
  return to === 'INR' ? value * CONVERSION_RATE : value / CONVERSION_RATE;
};

const EmotionIndicator: React.FC<{ emotion: Emotion }> = ({ emotion }) => {
  const getEmotionStyles = (emo: Emotion) => {
    switch (emo) {
      case Emotion.CONFIDENT:
        return { color: 'text-emerald-400', bg: 'bg-emerald-400' };
      case Emotion.GREED:
        return { color: 'text-amber-400', bg: 'bg-amber-400' };
      case Emotion.FEAR:
        return { color: 'text-rose-400', bg: 'bg-rose-400' };
      case Emotion.ANXIOUS:
        return { color: 'text-orange-400', bg: 'bg-orange-400' };
      case Emotion.REVENGE:
        return { color: 'text-red-500', bg: 'bg-red-500' };
      case Emotion.NEUTRAL:
      default:
        return { color: 'text-slate-400', bg: 'bg-slate-400' };
    }
  };

  const styles = getEmotionStyles(emotion);

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${styles.bg} shadow-[0_0_4px_rgba(0,0,0,0.5)]`}></span>
      <span className={styles.color}>{emotion}</span>
    </div>
  );
};

const TradeList: React.FC<Props> = ({ trades, displayCurrency, onCloseTrade, onDeleteTrade, onUpdateTrade }) => {
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [manualPnL, setManualPnL] = useState<number>(0);
  const [exitEmotion, setExitEmotion] = useState<Emotion>(Emotion.NEUTRAL);

  const currencySymbol = displayCurrency === 'USD' ? '$' : '₹';

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrade) {
      onUpdateTrade(editingTrade);
      setEditingTrade(null);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h3 className="text-xl font-bold">Positions ({displayCurrency})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4">Dir</th>
              <th className="px-6 py-4">Entry</th>
              <th className="px-6 py-4 text-center">Outcome</th>
              <th className="px-6 py-4">Psychology</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {trades.map(trade => {
              const displayPnL = convert(trade.pnl, trade.currency, displayCurrency);
              const displayEntry = convert(trade.entryPrice, trade.currency, displayCurrency);
              
              return (
                <tr key={trade.id} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{trade.symbol}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{trade.currency} Original</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      trade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300 font-mono text-sm">{currencySymbol}{displayEntry.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`font-mono text-sm font-bold ${
                      trade.status === TradeStatus.OPEN ? 'text-slate-500 italic' : 
                      (trade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {trade.status === TradeStatus.OPEN ? 'Active' : `${displayPnL >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(displayPnL).toFixed(2)}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] leading-tight">
                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                      <EmotionIndicator emotion={trade.entryEmotion} />
                      {trade.exitEmotion && <EmotionIndicator emotion={trade.exitEmotion} />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingTrade(trade)}
                        className="text-slate-500 hover:text-indigo-400 p-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      
                      {trade.status === TradeStatus.OPEN ? (
                        <button 
                          onClick={() => {
                            setClosingId(trade.id);
                            // Reset defaults based on entry
                            setExitPrice(trade.entryPrice);
                            setManualPnL(0);
                          }}
                          className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase transition-all"
                        >
                          Exit
                        </button>
                      ) : (
                        <button 
                          onClick={() => setDeletingId(trade.id)}
                          className="text-slate-600 hover:text-rose-400 p-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal (Currency aware) */}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <form onSubmit={handleEditSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white">Edit Record</h3>
               <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                {(['USD', 'INR'] as Currency[]).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setEditingTrade({...editingTrade, currency: curr})}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      editingTrade.currency === curr ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
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
                  value={editingTrade.symbol}
                  onChange={e => setEditingTrade({...editingTrade, symbol: e.target.value.toUpperCase()})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Currency</label>
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-400">{editingTrade.currency} Position</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Entry Price ({editingTrade.currency === 'USD' ? '$' : '₹'})</label>
                <input 
                  type="number" step="any"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
                  value={editingTrade.entryPrice}
                  onChange={e => setEditingTrade({...editingTrade, entryPrice: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
                  value={editingTrade.status}
                  onChange={e => setEditingTrade({...editingTrade, status: e.target.value as TradeStatus})}
                >
                  <option value={TradeStatus.OPEN}>Open</option>
                  <option value={TradeStatus.CLOSED}>Closed</option>
                </select>
              </div>
              {editingTrade.status === TradeStatus.CLOSED && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Exit Price ({editingTrade.currency === 'USD' ? '$' : '₹'})</label>
                    <input 
                      type="number" step="any"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
                      value={editingTrade.exitPrice || 0}
                      onChange={e => setEditingTrade({...editingTrade, exitPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">PnL Amount ({editingTrade.currency === 'USD' ? '$' : '₹'})</label>
                    <input 
                      type="number" step="any"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
                      value={editingTrade.pnl || 0}
                      onChange={e => setEditingTrade({...editingTrade, pnl: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Exit Emotion</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-xs"
                      value={editingTrade.exitEmotion || Emotion.NEUTRAL}
                      onChange={e => setEditingTrade({...editingTrade, exitEmotion: e.target.value as Emotion})}
                    >
                      {Object.values(Emotion).map(emo => <option key={emo} value={emo}>{emo}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3 mt-8">
              <button type="button" onClick={() => setEditingTrade(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all">Cancel</button>
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Exit Modal with Manual PnL Option */}
      {closingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-white text-center">Close Trade</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Final Profit / Loss ({currencySymbol})</label>
                <input 
                  type="number" step="any" autoFocus
                  placeholder="e.g. +500 or -200"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-lg font-bold"
                  onChange={e => setManualPnL(parseFloat(e.target.value))}
                />
                <p className="text-[10px] text-slate-500 mt-1 uppercase">Enter total amount won (+) or lost (-)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Final Exit Price (Optional)</label>
                <input 
                  type="number" step="any"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  value={exitPrice}
                  onChange={e => setExitPrice(parseFloat(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Final Emotion</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  onChange={e => setExitEmotion(e.target.value as Emotion)}
                  defaultValue={Emotion.NEUTRAL}
                >
                  {Object.values(Emotion).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setClosingId(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all">Back</button>
                <button 
                  onClick={() => { 
                    onCloseTrade(closingId, exitPrice, exitEmotion, manualPnL); 
                    setClosingId(null); 
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                >
                  Close & Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Discard Entry?</h3>
            <p className="text-slate-400 text-sm mb-8">This action will permanently remove the trade from your journal.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all">Cancel</button>
              <button 
                onClick={() => { onDeleteTrade(deletingId); setDeletingId(null); }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeList;
