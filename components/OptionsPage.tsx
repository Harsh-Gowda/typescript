import React, { useState, useEffect } from 'react';
import {
  OptionTrade, OptionType, OptionSide, OptionUnderlying,
  TradeStatus, Emotion, LOT_SIZES, BROKERAGE_PER_ORDER, STT_RATE, OptionStats
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

function calcCharges(trade: Partial<OptionTrade> & { exitPremium: number }): {
  grossPnl: number; brokerage: number; stt: number; otherCharges: number; netPnl: number; roi: number;
} {
  const qty = (trade.lots || 1) * (trade.lotSize || 1);
  const entry = trade.entryPremium || 0;
  const exit = trade.exitPremium;

  let grossPnl = 0;
  if (trade.side === 'BUY') {
    grossPnl = (exit - entry) * qty;
  } else {
    // SELL: profit when premium drops
    grossPnl = (entry - exit) * qty;
  }

  // Brokerage: Rs.20 per order (entry + exit) = Rs.40 total (flat fee)
  const brokerage = BROKERAGE_PER_ORDER * 2;

  // STT: 0.0625% on the sell side premium × qty
  // For BUY trade: STT on exit (when you sell to close)
  // For SELL trade: STT on entry (when you sell to open)
  const sttBase = trade.side === 'BUY' ? exit * qty : entry * qty;
  const stt = parseFloat((sttBase * STT_RATE).toFixed(2));

  // Other charges: Exchange transaction charge (0.05%) + GST 18% on brokerage + SEBI fee
  const turnover = (entry + exit) * qty;
  const exchangeCharge = parseFloat((turnover * 0.0005).toFixed(2));
  const gstOnBrokerage = parseFloat((brokerage * 0.18).toFixed(2));
  const sebiCharge = parseFloat((turnover * 0.000001).toFixed(2));
  const otherCharges = parseFloat((exchangeCharge + gstOnBrokerage + sebiCharge).toFixed(2));

  const netPnl = parseFloat((grossPnl - brokerage - stt - otherCharges).toFixed(2));
  const entryVal = entry * qty;
  const roi = entryVal > 0 ? parseFloat(((netPnl / entryVal) * 100).toFixed(2)) : 0;

  return { grossPnl, brokerage, stt, otherCharges, netPnl, roi };
}

function calcOptionStats(trades: OptionTrade[]): OptionStats {
  const closed = trades.filter(t => t.status === TradeStatus.CLOSED);
  const wins = closed.filter(t => (t.netPnl || 0) > 0);
  const totalNetPnl = closed.reduce((s, t) => s + (t.netPnl || 0), 0);
  const totalGrossPnl = closed.reduce((s, t) => s + (t.grossPnl || 0), 0);
  const totalCharges = closed.reduce((s, t) => s + (t.brokerage || 0) + (t.stt || 0) + (t.otherCharges || 0), 0);
  const avgRoi = closed.length > 0 ? closed.reduce((s, t) => s + (t.roi || 0), 0) / closed.length : 0;
  const pnls = closed.map(t => t.netPnl || 0);
  return {
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === TradeStatus.OPEN).length,
    closedTrades: closed.length,
    winTrades: wins.length,
    lossTrades: closed.length - wins.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    totalNetPnl,
    totalGrossPnl,
    totalCharges,
    avgRoi,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
  };
}

// ─── Emotion Emoji Map ──────────────────────────────────────────────────────
const emotionEmoji: Record<Emotion, string> = {
  [Emotion.FEAR]: '😨',
  [Emotion.GREED]: '🤑',
  [Emotion.NEUTRAL]: '😐',
  [Emotion.CONFIDENT]: '💪',
  [Emotion.ANXIOUS]: '😰',
  [Emotion.REVENGE]: '😤',
};

// ─── Close Modal ─────────────────────────────────────────────────────────────

interface CloseModalProps {
  trade: OptionTrade;
  onClose: (exitPremium: number, exitEmotion: Emotion, notes?: string) => void;
  onCancel: () => void;
}

const CloseModal: React.FC<CloseModalProps> = ({ trade, onClose, onCancel }) => {
  const [exitPremium, setExitPremium] = useState('');
  const [exitEmotion, setExitEmotion] = useState<Emotion>(Emotion.NEUTRAL);
  const [exitNotes, setExitNotes] = useState('');
  const preview = exitPremium
    ? calcCharges({ ...trade, exitPremium: parseFloat(exitPremium) })
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-black text-white tracking-tight">Close Option Position</h3>
          <p className="text-slate-400 text-xs mt-1">
            {trade.underlying !== 'CUSTOM' ? trade.underlying : trade.customSymbol} {trade.strikePrice} {trade.optionType} • {trade.side} • {trade.lots} lot{trade.lots > 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Exit Premium (₹)</label>
            <input
              type="number"
              value={exitPremium}
              onChange={e => setExitPremium(e.target.value)}
              placeholder="e.g. 200"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {preview && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">P&L Preview</p>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Gross P&L</span><span className={preview.grossPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{fmt(preview.grossPnl)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Brokerage</span><span className="text-amber-400">-{fmt(preview.brokerage)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">STT</span><span className="text-amber-400">-{fmt(preview.stt)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Other Charges</span><span className="text-amber-400">-{fmt(preview.otherCharges)}</span></div>
              <div className="border-t border-slate-700 pt-2 flex justify-between"><span className="text-sm font-black text-white">Net P&L</span><span className={`text-sm font-black ${preview.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(preview.netPnl)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">ROI</span><span className={preview.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{preview.roi.toFixed(2)}%</span></div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Exit Emotion</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(Emotion).map(e => (
                <button key={e} onClick={() => setExitEmotion(e)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${exitEmotion === e ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {emotionEmoji[e]} {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Exit Notes (optional)</label>
            <textarea
              value={exitNotes}
              onChange={e => setExitNotes(e.target.value)}
              rows={2}
              placeholder="What happened? Why did you exit?"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="p-6 flex gap-3 border-t border-slate-800">
          <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors">Cancel</button>
          <button
            onClick={() => exitPremium && onClose(parseFloat(exitPremium), exitEmotion, exitNotes || undefined)}
            disabled={!exitPremium}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-black text-sm transition-all"
          >
            Close Position
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add Trade Form ───────────────────────────────────────────────────────────

interface AddFormProps {
  onSubmit: (trade: Omit<OptionTrade, 'id'>) => void;
  onCancel: () => void;
}

const UNDERLYINGS: OptionUnderlying[] = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY', 'CUSTOM'];
const STRATEGIES = ['Scalp', 'Swing', 'Hedged', 'Straddle', 'Strangle', 'Iron Condor', 'Directional'];

const AddOptionForm: React.FC<AddFormProps> = ({ onSubmit, onCancel }) => {
  const [underlying, setUnderlying] = useState<OptionUnderlying>('NIFTY');
  const [customSymbol, setCustomSymbol] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [optionType, setOptionType] = useState<OptionType>('CE');
  const [expiryDate, setExpiryDate] = useState('');
  const [side, setSide] = useState<OptionSide>('BUY');
  const [entryPremium, setEntryPremium] = useState('');
  const [lots, setLots] = useState('1');
  const [lotSize, setLotSize] = useState(LOT_SIZES['NIFTY']);
  const [customLotSize, setCustomLotSize] = useState('1');
  const [entryEmotion, setEntryEmotion] = useState<Emotion>(Emotion.NEUTRAL);
  const [strategy, setStrategy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (underlying !== 'CUSTOM') {
      setLotSize(LOT_SIZES[underlying]);
    } else {
      setLotSize(parseInt(customLotSize) || 1);
    }
  }, [underlying, customLotSize]);

  const totalQty = (parseInt(lots) || 0) * lotSize;
  const entryValue = (parseFloat(entryPremium) || 0) * totalQty;

  const handleSubmit = async () => {
    if (!strikePrice || !entryPremium || !expiryDate || !lots) return;
    setSubmitting(true);
    const newTrade: Omit<OptionTrade, 'id'> = {
      underlying,
      customSymbol: underlying === 'CUSTOM' ? customSymbol : undefined,
      strikePrice: parseFloat(strikePrice),
      optionType,
      expiryDate,
      side,
      entryPremium: parseFloat(entryPremium),
      lots: parseInt(lots),
      lotSize,
      totalQty,
      entryValue,
      entryEmotion,
      strategy: strategy || undefined,
      notes: notes || undefined,
      status: TradeStatus.OPEN,
      timestamp: Date.now(),
    };
    await onSubmit(newTrade);
    setSubmitting(false);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </div>
        <h3 className="text-sm font-black text-white uppercase tracking-widest">New Options Trade</h3>
      </div>

      {/* Underlying Selection */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Underlying Index</label>
        <div className="grid grid-cols-3 gap-2">
          {UNDERLYINGS.map(u => (
            <button key={u} onClick={() => setUnderlying(u)}
              className={`py-2.5 rounded-xl text-xs font-black transition-all tracking-wide ${underlying === u ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              {u}
            </button>
          ))}
        </div>
        {underlying === 'CUSTOM' && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Symbol Name</label>
              <input value={customSymbol} onChange={e => setCustomSymbol(e.target.value)} placeholder="e.g. RELIANCE" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Lot Size</label>
              <input type="number" value={customLotSize} onChange={e => setCustomLotSize(e.target.value)} placeholder="e.g. 500" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        )}
      </div>

      {/* CE / PE + BUY / SELL */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Option Type</label>
          <div className="flex gap-2">
            {(['CE', 'PE'] as OptionType[]).map(o => (
              <button key={o} onClick={() => setOptionType(o)}
                className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${optionType === o
                  ? o === 'CE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {o === 'CE' ? '📈 CE' : '📉 PE'}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 mt-1">{optionType === 'CE' ? 'Call — profit if market rises' : 'Put — profit if market falls'}</p>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Side</label>
          <div className="flex gap-2">
            {(['BUY', 'SELL'] as OptionSide[]).map(s => (
              <button key={s} onClick={() => setSide(s)}
                className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${side === s
                  ? s === 'BUY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {s === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 mt-1">{side === 'BUY' ? 'Buying premium (debit trade)' : 'Writing/selling premium (credit trade)'}</p>
        </div>
      </div>

      {/* Strike + Expiry */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Strike Price</label>
          <input type="number" value={strikePrice} onChange={e => setStrikePrice(e.target.value)} placeholder="e.g. 25000" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Expiry Date</label>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
      </div>

      {/* Entry Premium + Lots */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Entry Premium (₹)</label>
          <input type="number" value={entryPremium} onChange={e => setEntryPremium(e.target.value)} placeholder="e.g. 120" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Lots <span className="text-indigo-400">(1 lot = {lotSize} qty)</span>
          </label>
          <input type="number" value={lots} onChange={e => setLots(e.target.value)} min="1" placeholder="1" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
      </div>

      {/* Live Summary */}
      {entryPremium && lots && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Total Qty</p>
            <p className="text-lg font-black text-white mt-1">{fmtNum(totalQty)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Capital Used</p>
            <p className="text-lg font-black text-indigo-400 mt-1">{fmt(entryValue)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Lot Size</p>
            <p className="text-lg font-black text-slate-300 mt-1">{lotSize}</p>
          </div>
        </div>
      )}

      {/* Strategy */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Strategy (optional)</label>
        <div className="flex flex-wrap gap-2">
          {STRATEGIES.map(s => (
            <button key={s} onClick={() => setStrategy(strategy === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${strategy === s ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Entry Emotion */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Entry Emotion</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(Emotion).map(e => (
            <button key={e} onClick={() => setEntryEmotion(e)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${entryEmotion === e ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {emotionEmoji[e]} {e}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Your setup, reason for trade, key levels..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-3.5 bg-slate-800 text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-colors">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!strikePrice || !entryPremium || !expiryDate || !lots || submitting}
          className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          {submitting ? 'Saving...' : 'Log Trade'}
        </button>
      </div>
    </div>
  );
};

// ─── Trade Row ────────────────────────────────────────────────────────────────

const TradeRow: React.FC<{ trade: OptionTrade; onClose: (t: OptionTrade) => void; onDelete: (id: string) => void }> = ({ trade, onClose, onDelete }) => {
  const symbol = trade.underlying !== 'CUSTOM' ? trade.underlying : (trade.customSymbol || 'CUSTOM');
  const isOpen = trade.status === TradeStatus.OPEN;
  const pnl = trade.netPnl;
  const isProfit = (pnl || 0) >= 0;

  return (
    <div className={`bg-slate-900/60 border rounded-2xl p-4 hover:border-slate-600 transition-all duration-300 group ${isOpen ? 'border-slate-700/50' : isProfit ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Option Type Badge */}
          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${trade.optionType === 'CE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {trade.optionType === 'CE' ? '📈' : '📉'} {trade.optionType}
          </span>
          {/* Side Badge */}
          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${trade.side === 'BUY' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
            {trade.side}
          </span>
          {/* Status */}
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${isOpen ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-700 text-slate-400'}`}>
            {trade.status}
          </span>
          {trade.strategy && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wide">{trade.strategy}</span>
          )}
        </div>

        {/* P&L or Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!isOpen && pnl !== undefined && (
            <div className={`text-right ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              <p className="text-sm font-black">{isProfit ? '+' : ''}{fmt(pnl)}</p>
              <p className="text-[9px] opacity-70">{(trade.roi || 0) >= 0 ? '+' : ''}{(trade.roi || 0).toFixed(1)}% ROI</p>
            </div>
          )}
          {isOpen && (
            <button onClick={() => onClose(trade)} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[10px] font-black rounded-lg transition-all border border-emerald-500/20">
              Close
            </button>
          )}
          <button onClick={() => onDelete(trade.id)} className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Contract Details */}
      <div className="mt-3">
        <p className="text-base font-black text-white tracking-tight">
          {symbol} <span className="text-indigo-400">{fmtNum(trade.strikePrice)}</span> {trade.optionType}
          <span className="text-slate-500 text-xs ml-2 font-normal">exp. {new Date(trade.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
          <span><span className="text-slate-400">Entry:</span> ₹{trade.entryPremium}</span>
          {trade.exitPremium && <span><span className="text-slate-400">Exit:</span> ₹{trade.exitPremium}</span>}
          <span><span className="text-slate-400">Lots:</span> {trade.lots} × {trade.lotSize} = {trade.totalQty} qty</span>
          <span><span className="text-slate-400">Capital:</span> {fmt(trade.entryValue)}</span>
        </div>
      </div>

      {/* P&L Breakdown (closed trades) */}
      {!isOpen && trade.grossPnl !== undefined && (
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">Gross</p>
            <p className={`text-xs font-bold ${(trade.grossPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(trade.grossPnl || 0)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">Brokerage</p>
            <p className="text-xs font-bold text-amber-400">-{fmt(trade.brokerage || 0)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">STT + Charges</p>
            <p className="text-xs font-bold text-amber-400">-{fmt((trade.stt || 0) + (trade.otherCharges || 0))}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">Net P&L</p>
            <p className={`text-xs font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(trade.netPnl || 0)}</p>
          </div>
        </div>
      )}

      {/* Emotions */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-600">
        <span>Entry: {emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</span>
        {trade.exitEmotion && <span>Exit: {emotionEmoji[trade.exitEmotion]} {trade.exitEmotion}</span>}
        <span className="ml-auto">{new Date(trade.timestamp).toLocaleDateString('en-IN')}</span>
      </div>

      {trade.notes && (
        <p className="mt-2 text-[10px] text-slate-500 bg-slate-800/50 rounded-lg p-2 italic">"{trade.notes}"</p>
      )}
    </div>
  );
};

// ─── Stats Cards ──────────────────────────────────────────────────────────────

const StatsBar: React.FC<{ stats: OptionStats }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {[
      { label: 'Net P&L', value: fmt(stats.totalNetPnl), color: stats.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400', sub: `Gross: ${fmt(stats.totalGrossPnl)}` },
      { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400', sub: `${stats.winTrades}W / ${stats.lossTrades}L` },
      { label: 'Avg ROI', value: `${stats.avgRoi.toFixed(1)}%`, color: stats.avgRoi >= 0 ? 'text-indigo-400' : 'text-rose-400', sub: `${stats.closedTrades} closed` },
      { label: 'Total Charges', value: fmt(stats.totalCharges), color: 'text-amber-400', sub: `${stats.openTrades} open` },
    ].map(card => (
      <div key={card.label} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600 transition-colors">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.label}</p>
        <p className={`text-xl font-black mt-1 ${card.color}`}>{card.value}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{card.sub}</p>
      </div>
    ))}
  </div>
);

// ─── Main Options Page ────────────────────────────────────────────────────────

const OptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<OptionTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [closingTrade, setClosingTrade] = useState<OptionTrade | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CE' | 'PE'>('ALL');
  const [underlyingFilter, setUnderlyingFilter] = useState<string>('ALL');

  const fetchTrades = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('option_trades')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      const mapped: OptionTrade[] = data.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        underlying: t.underlying,
        customSymbol: t.custom_symbol,
        strikePrice: t.strike_price,
        optionType: t.option_type,
        expiryDate: t.expiry_date,
        side: t.side,
        entryPremium: t.entry_premium,
        exitPremium: t.exit_premium,
        lots: t.lots,
        lotSize: t.lot_size,
        totalQty: t.total_qty,
        entryValue: t.entry_value,
        exitValue: t.exit_value,
        grossPnl: t.gross_pnl,
        brokerage: t.brokerage,
        stt: t.stt,
        otherCharges: t.other_charges,
        netPnl: t.net_pnl,
        roi: t.roi,
        entryEmotion: t.entry_emotion,
        exitEmotion: t.exit_emotion,
        status: t.status,
        timestamp: Number(t.timestamp),
        exitTimestamp: t.exit_timestamp ? Number(t.exit_timestamp) : undefined,
        notes: t.notes,
        exitChartUrl: t.exit_chart_url,
        strategy: t.strategy,
      }));
      setTrades(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrades(); }, [user]);

  const handleAddTrade = async (trade: Omit<OptionTrade, 'id'>) => {
    if (!user) return;
    const { error } = await supabase.from('option_trades').insert({
      user_id: user.id,
      underlying: trade.underlying,
      custom_symbol: trade.customSymbol,
      strike_price: trade.strikePrice,
      option_type: trade.optionType,
      expiry_date: trade.expiryDate,
      side: trade.side,
      entry_premium: trade.entryPremium,
      lots: trade.lots,
      lot_size: trade.lotSize,
      total_qty: trade.totalQty,
      entry_value: trade.entryValue,
      entry_emotion: trade.entryEmotion,
      strategy: trade.strategy,
      notes: trade.notes,
      status: TradeStatus.OPEN,
      timestamp: trade.timestamp,
    });
    if (!error) {
      setShowForm(false);
      fetchTrades();
    } else {
      console.error('Error adding option trade:', error);
      alert('Failed to save. Check console.');
    }
  };

  const handleCloseTrade = async (exitPremium: number, exitEmotion: Emotion, exitNotes?: string) => {
    if (!closingTrade) return;
    const charges = calcCharges({ ...closingTrade, exitPremium });
    const finalNotes = [closingTrade.notes, exitNotes ? `[EXIT]: ${exitNotes}` : ''].filter(Boolean).join('\n\n');

    const { error } = await supabase.from('option_trades').update({
      exit_premium: exitPremium,
      exit_value: exitPremium * closingTrade.totalQty,
      gross_pnl: charges.grossPnl,
      brokerage: charges.brokerage,
      stt: charges.stt,
      other_charges: charges.otherCharges,
      net_pnl: charges.netPnl,
      roi: charges.roi,
      exit_emotion: exitEmotion,
      notes: finalNotes || closingTrade.notes,
      status: TradeStatus.CLOSED,
      exit_timestamp: Date.now(),
    }).eq('id', closingTrade.id);

    if (!error) {
      setClosingTrade(null);
      fetchTrades();
    } else {
      alert('Failed to close trade: ' + error.message);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!confirm('Delete this options trade permanently?')) return;
    await supabase.from('option_trades').delete().eq('id', id);
    fetchTrades();
  };

  const stats = calcOptionStats(trades);
  const uniqueUnderlyings = ['ALL', ...Array.from(new Set(trades.map(t => t.underlying !== 'CUSTOM' ? t.underlying : (t.customSymbol || 'CUSTOM'))))];

  const filtered = trades.filter(t => {
    const sym = t.underlying !== 'CUSTOM' ? t.underlying : (t.customSymbol || 'CUSTOM');
    if (filter !== 'ALL' && t.status !== filter) return false;
    if (typeFilter !== 'ALL' && t.optionType !== typeFilter) return false;
    if (underlyingFilter !== 'ALL' && sym !== underlyingFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Close Modal */}
      {closingTrade && (
        <CloseModal
          trade={closingTrade}
          onClose={handleCloseTrade}
          onCancel={() => setClosingTrade(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Options Chain Journal</h2>
              <p className="text-slate-500 text-xs mt-0.5">Indian Market • CE/PE • NIFTY, BANKNIFTY & more</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <svg className={`w-4 h-4 transition-transform ${showForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {showForm ? 'Cancel' : 'New Options Trade'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <AddOptionForm onSubmit={handleAddTrade} onCancel={() => setShowForm(false)} />
      )}

      {/* Stats */}
      {trades.length > 0 && <StatsBar stats={stats} />}

      {/* Filters */}
      {trades.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all tracking-widest uppercase ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {f}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1">
            {(['ALL', 'CE', 'PE'] as const).map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all tracking-widest uppercase ${typeFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {f === 'CE' ? '📈 CE' : f === 'PE' ? '📉 PE' : 'ALL'}
              </button>
            ))}
          </div>
          {/* Underlying filter */}
          <div className="flex flex-wrap gap-1">
            {uniqueUnderlyings.map(u => (
              <button key={u} onClick={() => setUnderlyingFilter(u)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all tracking-widest uppercase ${underlyingFilter === u ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300 bg-slate-900/40 border border-slate-700/30'}`}>
                {u}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] text-slate-600">{filtered.length} trade{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Trade List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div>
            <p className="text-slate-400 font-bold">No options trades yet</p>
            <p className="text-slate-600 text-sm mt-1">Start logging your CE/PE trades to track your P&L</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Log First Options Trade
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(trade => (
            <TradeRow
              key={trade.id}
              trade={trade}
              onClose={setClosingTrade}
              onDelete={handleDeleteTrade}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OptionsPage;
