import React, { useState, useEffect, useMemo } from 'react';
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

// ─── Open Trade Row ───────────────────────────────────────────────────────────

const OpenTradeRow: React.FC<{ trade: OptionTrade; onClose: (t: OptionTrade) => void; onDelete: (id: string) => void }> = ({ trade, onClose, onDelete }) => {
  const symbol = trade.underlying !== 'CUSTOM' ? trade.underlying : (trade.customSymbol || 'CUSTOM');

  return (
    <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 hover:border-amber-400/40 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${trade.optionType === 'CE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {trade.optionType === 'CE' ? '📈' : '📉'} {trade.optionType}
          </span>
          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${trade.side === 'BUY' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
            {trade.side}
          </span>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">OPEN</span>
          {trade.strategy && <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">{trade.strategy}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onClose(trade)} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[10px] font-black rounded-lg transition-all border border-emerald-500/20">
            Close
          </button>
          <button onClick={() => onDelete(trade.id)} className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-base font-black text-white">
          {symbol} <span className="text-indigo-400">{fmtNum(trade.strikePrice)}</span> {trade.optionType}
          <span className="text-slate-500 text-xs ml-2 font-normal">exp. {new Date(trade.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
          <span><span className="text-slate-400">Entry:</span> ₹{trade.entryPremium}</span>
          <span><span className="text-slate-400">Lots:</span> {trade.lots} × {trade.lotSize} = {trade.totalQty} qty</span>
          <span><span className="text-slate-400">Capital:</span> {fmt(trade.entryValue)}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-600">
        <span>Entry: {emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</span>
        <span className="ml-auto">{new Date(trade.timestamp).toLocaleDateString('en-IN')}</span>
      </div>
      {trade.notes && <p className="mt-2 text-[10px] text-slate-500 bg-slate-800/50 rounded-lg p-2 italic">"{trade.notes}"</p>}
    </div>
  );
};

// ─── Closed Trade Grid Card ──────────────────────────────────────────────────

const ClosedTradeCard: React.FC<{ trade: OptionTrade; onDelete: (id: string) => void }> = ({ trade, onDelete }) => {
  const [expanded, setExpanded] = React.useState(false);
  const symbol = trade.underlying !== 'CUSTOM' ? trade.underlying : (trade.customSymbol || 'CUSTOM');
  const pnl = trade.netPnl || 0;
  const isProfit = pnl >= 0;

  return (
    <div className="relative">
      <div
        onClick={() => setExpanded(e => !e)}
        className={`cursor-pointer rounded-xl border p-3 transition-all hover:scale-[1.02] ${isProfit
          ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50'
          : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/50'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${trade.optionType === 'CE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {trade.optionType}
            </span>
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${trade.side === 'BUY' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
              {trade.side}
            </span>
          </div>
          <span className="text-[8px] text-slate-600">{new Date(trade.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
        </div>
        <p className="text-sm font-black text-white truncate">{symbol} {fmtNum(trade.strikePrice)}</p>
        <p className="text-[10px] text-slate-500">₹{trade.entryPremium} → {trade.exitPremium ? `₹${trade.exitPremium}` : '—'}</p>
        <p className={`text-base font-black mt-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isProfit ? '+' : ''}{fmt(pnl)}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-slate-600">{trade.lots} lot{trade.lots > 1 ? 's' : ''} × {trade.lotSize}</span>
          <span className={`text-[8px] font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl min-w-[210px]" onClick={e => e.stopPropagation()}>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-slate-500">Gross P&L</span><span className={isProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{fmt(trade.grossPnl || 0)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Brokerage</span><span className="text-amber-400">-{fmt(trade.brokerage || 0)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">STT+Charges</span><span className="text-amber-400">-{fmt((trade.stt || 0) + (trade.otherCharges || 0))}</span></div>
            <div className="flex justify-between text-xs border-t border-slate-800 pt-1.5"><span className="text-white font-black">Net P&L</span><span className={`font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(pnl)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">ROI</span><span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>{(trade.roi || 0).toFixed(2)}%</span></div>
            {trade.strategy && <div className="flex justify-between text-xs"><span className="text-slate-500">Strategy</span><span className="text-violet-400">{trade.strategy}</span></div>}
            <div className="flex justify-between text-xs"><span className="text-slate-500">Entry Emotion</span><span className="text-indigo-400">{emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</span></div>
            {trade.exitEmotion && <div className="flex justify-between text-xs"><span className="text-slate-500">Exit Emotion</span><span className="text-purple-400">{emotionEmoji[trade.exitEmotion]} {trade.exitEmotion}</span></div>}
            {trade.notes && <p className="text-[10px] text-slate-500 italic border-t border-slate-800 pt-1.5">{trade.notes}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setExpanded(false)} className="flex-1 py-1.5 bg-slate-800 text-slate-400 text-[10px] font-black rounded-lg hover:bg-slate-700 transition-all">Close</button>
              <button onClick={() => onDelete(trade.id)} className="py-1.5 px-3 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white text-[10px] font-black rounded-lg transition-all border border-rose-500/20">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Closed Trade List Row ───────────────────────────────────────────────────

const ClosedTradeListRow: React.FC<{ trade: OptionTrade; onDelete: (id: string) => void }> = ({ trade, onDelete }) => {
  const [expanded, setExpanded] = React.useState(false);
  const symbol = trade.underlying !== 'CUSTOM' ? trade.underlying : (trade.customSymbol || 'CUSTOM');
  const pnl = trade.netPnl || 0;
  const isProfit = pnl >= 0;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${isProfit ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
      <div
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${trade.optionType === 'CE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{trade.optionType}</span>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${trade.side === 'BUY' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>{trade.side}</span>
          <span className="font-black text-white text-sm truncate">{symbol} {fmtNum(trade.strikePrice)}</span>
          <span className="text-[9px] text-slate-600 shrink-0 hidden sm:block">{new Date(trade.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
        </div>
        <span className="hidden sm:block text-[10px] text-slate-500">{trade.lots}L × {trade.lotSize}</span>
        <span className="text-sm">{emotionEmoji[trade.entryEmotion] || '😐'}</span>
        <div className={`text-right shrink-0 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          <p className="text-sm font-black">{isProfit ? '+' : ''}{fmt(pnl)}</p>
          <p className="text-[9px] opacity-70">{(trade.roi || 0).toFixed(1)}%</p>
        </div>
        <svg className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-slate-900/60 border-t border-slate-700/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div><p className="text-[9px] text-slate-500 uppercase">Entry Premium</p><p className="text-xs font-bold text-slate-200">₹{trade.entryPremium}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase">Exit Premium</p><p className="text-xs font-bold text-slate-200">{trade.exitPremium ? `₹${trade.exitPremium}` : '—'}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase">Gross P&L</p><p className={`text-xs font-bold ${(trade.grossPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(trade.grossPnl || 0)}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase">Net P&L</p><p className={`text-xs font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(pnl)}</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div><p className="text-[9px] text-slate-500 uppercase">Brokerage</p><p className="text-xs text-amber-400">-{fmt(trade.brokerage || 0)}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase">STT+Other</p><p className="text-xs text-amber-400">-{fmt((trade.stt || 0) + (trade.otherCharges || 0))}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase">ROI</p><p className={`text-xs font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>{(trade.roi || 0).toFixed(2)}%</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase">Capital Used</p><p className="text-xs text-indigo-400">{fmt(trade.entryValue)}</p></div>
          </div>
          <div className="flex items-center gap-3 mb-2 text-[10px] text-slate-500">
            <span>Entry: {emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</span>
            {trade.exitEmotion && <span>Exit: {emotionEmoji[trade.exitEmotion]} {trade.exitEmotion}</span>}
          </div>
          {trade.notes && <p className="text-[10px] text-slate-500 italic bg-slate-800/40 rounded-lg p-2 mb-2">{trade.notes}</p>}
          <div className="flex justify-end">
            <button onClick={() => onDelete(trade.id)} className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white text-[10px] font-black rounded-lg transition-all border border-rose-500/20">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Options P&L Graph (Cumulative) ─────────────────────────────────────────

const OptionsPnLGraph: React.FC<{ trades: OptionTrade[]; year: number; month: number }> = ({ trades, year, month }) => {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyPnl = useMemo(() => {
    const map: Record<number, number> = {};
    trades.forEach(t => {
      if (t.status !== TradeStatus.CLOSED) return;
      const d = new Date(t.timestamp);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      map[day] = (map[day] || 0) + (t.netPnl || 0);
    });
    return map;
  }, [trades, year, month]);

  const series: { day: number; cumPnl: number; dailyPnl: number }[] = [];
  let cum = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (dailyPnl[d] !== undefined) {
      cum += dailyPnl[d];
      series.push({ day: d, cumPnl: cum, dailyPnl: dailyPnl[d] });
    }
  }

  if (series.length === 0) return null;

  const allVals = series.map(s => s.cumPnl);
  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(0, ...allVals);
  const range = maxVal - minVal || 1;
  const W = 700, H = 140, PAD = 16;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const toX = (i: number) => PAD + (i / Math.max(series.length - 1, 1)) * chartW;
  const toY = (val: number) => PAD + chartH - ((val - minVal) / range) * chartH;
  const zeroY = toY(0);

  const pts = series.map((s, i) => `${toX(i).toFixed(1)},${toY(s.cumPnl).toFixed(1)}`).join(' L ');
  const linePath = `M ${pts}`;
  const fillPath = `M ${toX(0)},${zeroY.toFixed(1)} L ${pts} L ${toX(series.length - 1).toFixed(1)},${zeroY.toFixed(1)} Z`;

  const lastPnl = series[series.length - 1].cumPnl;
  const isPositive = lastPnl >= 0;

  return (
    <div className="bg-slate-900/60 border border-violet-500/20 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Options Cumulative P&L — {monthNames[month]} {year}</p>
          <p className={`text-2xl font-black mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}₹{lastPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">Best Day</p>
            <p className="text-sm font-black text-emerald-400">₹{Math.max(...Object.values(dailyPnl), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">Worst Day</p>
            <p className="text-sm font-black text-rose-400">₹{Math.min(...Object.values(dailyPnl), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="optGradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="optGradNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
        <path d={fillPath} fill={isPositive ? 'url(#optGradPos)' : 'url(#optGradNeg)'} />
        <path d={linePath} fill="none" stroke={isPositive ? '#10b981' : '#f43f5e'} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((s, i) => (
          <circle key={i} cx={toX(i)} cy={toY(s.cumPnl)} r="3.5" fill={s.cumPnl >= 0 ? '#10b981' : '#f43f5e'} stroke="#0f172a" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
};

// ─── Options Calendar ─────────────────────────────────────────────────────────

const OptionsCalendar: React.FC<{ trades: OptionTrade[]; onDelete: (id: string) => void }> = ({ trades, onDelete }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [closedViewMode, setClosedViewMode] = useState<'grid' | 'list'>('grid');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const dailyStats = useMemo(() => {
    const map: Record<number, { pnl: number; count: number }> = {};
    trades.forEach(t => {
      if (t.status !== TradeStatus.CLOSED) return;
      const d = new Date(t.timestamp);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      if (!map[day]) map[day] = { pnl: 0, count: 0 };
      map[day].pnl += t.netPnl || 0;
      map[day].count += 1;
    });
    return map;
  }, [trades, year, month]);

  const closedAll = trades.filter(t => t.status === TradeStatus.CLOSED);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`e-${i}`} className="h-14 sm:h-16 md:h-20 bg-slate-800/20 rounded-lg border border-slate-700/20" />);
    }
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const st = dailyStats[day];
      const hasTrades = st && st.count > 0;
      const isProfit = hasTrades && st.pnl >= 0;
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

      days.push(
        <div
          key={day}
          onClick={() => hasTrades && setSelectedDay(day)}
          className={`h-14 sm:h-16 md:h-20 p-1.5 rounded-lg border flex flex-col justify-between transition-all ${
            hasTrades
              ? isProfit
                ? 'bg-emerald-500/90 border-emerald-400 cursor-pointer hover:scale-[1.03] shadow-lg shadow-emerald-500/15'
                : 'bg-rose-500/90 border-rose-400 cursor-pointer hover:scale-[1.03] shadow-lg shadow-rose-500/15'
              : isToday
              ? 'border-violet-500/50 bg-transparent ring-1 ring-violet-500/30'
              : 'border-slate-700/40 bg-transparent hover:bg-slate-800/30'
          }`}
        >
          <span className={`text-[9px] md:text-[10px] font-bold ${
            hasTrades ? 'text-white/80' : isToday ? 'text-violet-400' : 'text-slate-600'
          }`}>{String(day).padStart(2, '0')}</span>
          {hasTrades && (
            <div>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-white truncate">
                ₹{st.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[8px] text-white/60 hidden sm:block">{st.count}T</p>
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-700/30 mt-2">
      {/* Graph */}
      <OptionsPnLGraph trades={trades} year={year} month={month} />

      {/* Calendar Grid */}
      <div className="bg-slate-900/60 border border-violet-500/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-black text-slate-200">Options Trading Calendar</span>
          </div>
          <div className="flex items-center bg-slate-800/60 rounded-xl border border-slate-700/50 p-1">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="min-w-[110px] text-center text-xs font-black text-slate-200 px-2">{monthNames[month]} {year}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-[9px] font-black text-slate-600 uppercase text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{renderDays()}</div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/30">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500/90 rounded-sm" /><span className="text-[9px] text-slate-500">Profit day</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-500/90 rounded-sm" /><span className="text-[9px] text-slate-500">Loss day</span></div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-slate-800 border border-slate-700 w-full max-w-xl max-h-[75vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-white">Options on {selectedDay} {monthNames[month]} {year}</h3>
                <p className="text-slate-500 text-xs">{trades.filter(t => { const d = new Date(t.timestamp); return d.getDate() === selectedDay && d.getMonth() === month && d.getFullYear() === year && t.status === TradeStatus.CLOSED; }).length} closed trades</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {trades.filter(t => { const d = new Date(t.timestamp); return d.getDate() === selectedDay && d.getMonth() === month && d.getFullYear() === year && t.status === TradeStatus.CLOSED; }).map(trade => {
                const pnl = trade.netPnl || 0;
                const isP = pnl >= 0;
                const sym = trade.underlying !== 'CUSTOM' ? trade.underlying : (trade.customSymbol || 'CUSTOM');
                return (
                  <div key={trade.id} className={`bg-slate-900/80 border rounded-xl p-4 ${isP ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-base font-black text-white">{sym} {fmtNum(trade.strikePrice)} {trade.optionType}</p>
                        <div className="flex gap-1.5 mt-1">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${trade.optionType === 'CE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{trade.optionType}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${trade.side === 'BUY' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>{trade.side}</span>
                        </div>
                      </div>
                      <div className={`text-right ${isP ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <p className="text-lg font-black">{isP ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        <p className="text-[9px] opacity-70">{(trade.roi || 0).toFixed(1)}% ROI</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div><p className="text-[9px] text-slate-500">Entry</p><p className="text-slate-200">₹{trade.entryPremium}</p></div>
                      <div><p className="text-[9px] text-slate-500">Exit</p><p className="text-slate-200">{trade.exitPremium ? `₹${trade.exitPremium}` : '—'}</p></div>
                      <div><p className="text-[9px] text-slate-500">Lots</p><p className="text-slate-200">{trade.lots} × {trade.lotSize}</p></div>
                      <div><p className="text-[9px] text-slate-500">Capital</p><p className="text-indigo-400">{fmt(trade.entryValue)}</p></div>
                    </div>
                    <div className="flex gap-3 mt-2 text-[9px] text-slate-500">
                      <span>{emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</span>
                      {trade.exitEmotion && <span>→ {emotionEmoji[trade.exitEmotion]} {trade.exitEmotion}</span>}
                    </div>
                    {trade.notes && <p className="mt-2 text-[9px] italic text-slate-500 bg-slate-800/50 rounded-lg p-2">{trade.notes}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Closed Journal — Grid/List */}
      {closedAll.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-widest">Closed Options Journal</p>
                <p className="text-[9px] text-slate-500">{closedAll.length} closed trade{closedAll.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex gap-1 bg-slate-800/60 border border-slate-700/40 rounded-xl p-1">
              <button onClick={() => setClosedViewMode('grid')} className={`p-2 rounded-lg transition-all ${closedViewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Grid">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <rect x="0" y="0" width="6" height="6" rx="1" /><rect x="10" y="0" width="6" height="6" rx="1" />
                  <rect x="0" y="10" width="6" height="6" rx="1" /><rect x="10" y="10" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button onClick={() => setClosedViewMode('list')} className={`p-2 rounded-lg transition-all ${closedViewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="List">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {closedViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {closedAll.map(trade => <ClosedTradeCard key={trade.id} trade={trade} onDelete={onDelete} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {closedAll.map(trade => <ClosedTradeListRow key={trade.id} trade={trade} onDelete={onDelete} />)}
            </div>
          )}
        </div>
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
  const [closedViewMode, setClosedViewMode] = useState<'grid' | 'list'>('grid');

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
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
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
        <div className="space-y-6">
          {/* Open Trades */}
          {filtered.filter(t => t.status === TradeStatus.OPEN).length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">🟡 Open Positions ({filtered.filter(t => t.status === TradeStatus.OPEN).length})</p>
              {filtered.filter(t => t.status === TradeStatus.OPEN).map(trade => (
                <OpenTradeRow key={trade.id} trade={trade} onClose={setClosingTrade} onDelete={handleDeleteTrade} />
              ))}
            </div>
          )}

          {/* Closed Trades (shown here only when filter is specifically CLOSED or ALL with type/underlying filter) */}
          {filtered.filter(t => t.status === TradeStatus.CLOSED).length > 0 && filter === 'CLOSED' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtered Closed ({filtered.filter(t => t.status === TradeStatus.CLOSED).length})</p>
              {filtered.filter(t => t.status === TradeStatus.CLOSED).map(trade => (
                <ClosedTradeListRow key={trade.id} trade={trade} onDelete={handleDeleteTrade} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Options Calendar + Graph + Closed Journal — always at bottom */}
      {trades.length > 0 && (
        <OptionsCalendar trades={trades} onDelete={handleDeleteTrade} />
      )}
    </div>
  );
};

export default OptionsPage;
