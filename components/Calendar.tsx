import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus, Currency, Emotion } from '../types';
import EditTradeModal from './EditTradeModal';

interface Props {
    trades: Trade[];
    displayCurrency: Currency;
    onUpdateTrade: (trade: Trade) => void;
}

const CONVERSION_RATE = 83.5;

const convert = (value: number | undefined, from: Currency, to: Currency) => {
    if (!value) return 0;
    if (from === to) return value;
    return to === 'INR' ? value * CONVERSION_RATE : value / CONVERSION_RATE;
};

// ─── P&L Cumulative Chart ─────────────────────────────────────────────────────
const PnLGraph: React.FC<{ trades: Trade[]; displayCurrency: Currency; year: number; month: number }> = ({
    trades, displayCurrency, year, month,
}) => {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dailyPnl = useMemo(() => {
        const map: Record<number, number> = {};
        trades.forEach(t => {
            if (t.status !== TradeStatus.CLOSED) return;
            const d = new Date(t.timestamp);
            if (d.getFullYear() !== year || d.getMonth() !== month) return;
            const day = d.getDate();
            map[day] = (map[day] || 0) + convert(t.pnl, t.currency, displayCurrency);
        });
        return map;
    }, [trades, year, month, displayCurrency]);

    // Build cumulative series
    const series: { day: number; cumPnl: number; dailyPnl: number }[] = [];
    let cum = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        cum += dailyPnl[d] || 0;
        if (dailyPnl[d] !== undefined || series.length > 0) {
            series.push({ day: d, cumPnl: cum, dailyPnl: dailyPnl[d] || 0 });
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

    const toX = (day: number) => PAD + ((day - series[0].day) / Math.max(series.length - 1, 1)) * chartW;
    const toY = (val: number) => PAD + chartH - ((val - minVal) / range) * chartH;

    const zeroY = toY(0);

    // Build path
    const pts = series.map(s => `${toX(s.day).toFixed(1)},${toY(s.cumPnl).toFixed(1)}`).join(' L ');
    const linePath = `M ${pts}`;

    // Fill path (close to zero line)
    const fillPath = `M ${toX(series[0].day).toFixed(1)},${zeroY.toFixed(1)} L ${pts} L ${toX(series[series.length - 1].day).toFixed(1)},${zeroY.toFixed(1)} Z`;

    const lastPnl = series[series.length - 1].cumPnl;
    const isPositive = lastPnl >= 0;
    const currSym = displayCurrency === 'USD' ? '$' : '₹';

    return (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 mb-2">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cumulative P&L — {monthNames[month]} {year}</p>
                    <p className={`text-2xl font-black mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{currSym}{lastPnl.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="flex gap-4 text-right">
                    <div>
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest">Best Day</p>
                        <p className="text-sm font-black text-emerald-400">
                            {currSym}{Math.max(...Object.values(dailyPnl), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest">Worst Day</p>
                        <p className="text-sm font-black text-rose-400">
                            {currSym}{Math.min(...Object.values(dailyPnl), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-hidden">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full"
                    style={{ height: 140 }}
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="pnlGradPos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="pnlGradNeg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.02" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.35" />
                        </linearGradient>
                    </defs>

                    {/* Zero line */}
                    <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />

                    {/* Fill area */}
                    <path d={fillPath} fill={isPositive ? 'url(#pnlGradPos)' : 'url(#pnlGradNeg)'} />

                    {/* Line */}
                    <path d={linePath} fill="none" stroke={isPositive ? '#10b981' : '#f43f5e'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                    {/* Dots on trade days */}
                    {series.map(s => (
                        <circle
                            key={s.day}
                            cx={toX(s.day)}
                            cy={toY(s.cumPnl)}
                            r="3"
                            fill={s.cumPnl >= 0 ? '#10b981' : '#f43f5e'}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};

// ─── Closed Journal (Grid/List) ───────────────────────────────────────────────
const emotionEmoji: Record<string, string> = {
    'Fear': '😨', 'Greed': '🤑', 'Neutral': '😐',
    'Confident': '💪', 'Anxious': '😰', 'Revenge-Seeking': '😤',
};

const ClosedJournal: React.FC<{
    trades: Trade[];
    displayCurrency: Currency;
    onEditTrade: (t: Trade) => void;
}> = ({ trades, displayCurrency, onEditTrade }) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const currSym = displayCurrency === 'USD' ? '$' : '₹';

    const closed = trades.filter(t => t.status === TradeStatus.CLOSED);
    if (closed.length === 0) return null;

    const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Closed Journal</h3>
                        <p className="text-[10px] text-slate-500">{closed.length} closed trade{closed.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                {/* View Toggle */}
                <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Grid view"
                    >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                            <rect x="0" y="0" width="6" height="6" rx="1" />
                            <rect x="10" y="0" width="6" height="6" rx="1" />
                            <rect x="0" y="10" width="6" height="6" rx="1" />
                            <rect x="10" y="10" width="6" height="6" rx="1" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        title="List view"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {closed.map(trade => {
                        const pnl = convert(trade.pnl, trade.currency, displayCurrency);
                        const isProfit = pnl >= 0;
                        const isExpanded = expandedId === trade.id;

                        return (
                            <div key={trade.id} className="relative">
                                <div
                                    onClick={() => toggleExpand(trade.id)}
                                    className={`cursor-pointer rounded-xl border p-3 transition-all hover:scale-[1.02] ${isProfit
                                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50'
                                        : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${trade.type === 'Long'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-rose-500/10 text-rose-400'
                                        }`}>{trade.type}</span>
                                        <span className="text-[8px] text-slate-600">
                                            {new Date(trade.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>
                                    <p className="text-sm font-black text-white truncate">{trade.symbol}</p>
                                    <p className={`text-base font-black mt-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {isProfit ? '+' : ''}{currSym}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-[9px] text-slate-500 mt-0.5">Entry: {currSym}{trade.entryPrice.toLocaleString()}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[9px]">{emotionEmoji[trade.entryEmotion] || '😐'}</span>
                                        <span className={`text-[8px] font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isExpanded ? '▲ Less' : '▼ More'}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Detail Overlay */}
                                {isExpanded && (
                                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl min-w-[220px]">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Symbol</span>
                                                <span className="text-white font-bold">{trade.symbol}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Type</span>
                                                <span className={trade.type === 'Long' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{trade.type}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Entry</span>
                                                <span className="text-slate-200">{currSym}{trade.entryPrice.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Exit</span>
                                                <span className="text-slate-200">{trade.exitPrice ? `${currSym}${trade.exitPrice.toLocaleString()}` : '—'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Stop Loss</span>
                                                <span className="text-rose-400">{currSym}{trade.stopLoss.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Target</span>
                                                <span className="text-emerald-400">{currSym}{trade.target.toLocaleString()}</span>
                                            </div>
                                            <div className="border-t border-slate-800 pt-2 flex justify-between text-xs">
                                                <span className="text-slate-500">Net P&L</span>
                                                <span className={`font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isProfit ? '+' : ''}{currSym}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Entry Emotion</span>
                                                <span className="text-indigo-400">{emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</span>
                                            </div>
                                            {trade.exitEmotion && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Exit Emotion</span>
                                                    <span className="text-purple-400">{emotionEmoji[trade.exitEmotion]} {trade.exitEmotion}</span>
                                                </div>
                                            )}
                                            {trade.notes && (
                                                <div className="pt-2 border-t border-slate-800">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Notes</p>
                                                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                                                        {trade.notes.split('\n').filter(l => !l.includes('[EXIT CHART]:') && !l.includes('[EXIT PSYCHOLOGY]:')).join('\n').trim() || trade.notes}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEditTrade(trade); }}
                                                    className="flex-1 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white text-[10px] font-black rounded-lg transition-all"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                                                    className="flex-1 py-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 text-[10px] font-black rounded-lg transition-all"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="space-y-2">
                    {closed.map(trade => {
                        const pnl = convert(trade.pnl, trade.currency, displayCurrency);
                        const isProfit = pnl >= 0;
                        const isExpanded = expandedId === trade.id;

                        return (
                            <div key={trade.id} className={`rounded-xl border transition-all overflow-hidden ${isProfit ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                                {/* Row Header */}
                                <div
                                    onClick={() => toggleExpand(trade.id)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-700/30 transition-colors ${isExpanded ? 'bg-slate-800/80' : ''}`}
                                >
                                    {/* Symbol + Type */}
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 ${trade.type === 'Long'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}>{trade.type}</span>
                                        <span className="font-black text-white text-sm truncate">{trade.symbol}</span>
                                        <span className="text-[9px] text-slate-600 shrink-0">
                                            {new Date(trade.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Entry → Exit */}
                                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                                        <span>{currSym}{trade.entryPrice.toLocaleString()}</span>
                                        <span>→</span>
                                        <span className="text-slate-300">{trade.exitPrice ? `${currSym}${trade.exitPrice.toLocaleString()}` : '—'}</span>
                                    </div>

                                    {/* Emotion */}
                                    <span className="text-sm">{emotionEmoji[trade.entryEmotion] || '😐'}</span>

                                    {/* P&L */}
                                    <div className={`text-right shrink-0 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        <p className="text-sm font-black">{isProfit ? '+' : ''}{currSym}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>

                                    {/* Expand arrow */}
                                    <svg className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-3 bg-slate-900/60 border-t border-slate-700/30">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Entry</p>
                                                <p className="text-sm font-bold text-slate-200">{currSym}{trade.entryPrice.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Exit</p>
                                                <p className="text-sm font-bold text-slate-200">{trade.exitPrice ? `${currSym}${trade.exitPrice.toLocaleString()}` : '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Stop Loss</p>
                                                <p className="text-sm font-bold text-rose-400">{currSym}{trade.stopLoss.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Target</p>
                                                <p className="text-sm font-bold text-emerald-400">{currSym}{trade.target.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Net P&L</p>
                                                <p className={`text-sm font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isProfit ? '+' : ''}{currSym}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Entry Emotion</p>
                                                <p className="text-xs text-indigo-400 font-bold">{emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</p>
                                            </div>
                                            {trade.exitEmotion && (
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">Exit Emotion</p>
                                                    <p className="text-xs text-purple-400 font-bold">{emotionEmoji[trade.exitEmotion]} {trade.exitEmotion}</p>
                                                </div>
                                            )}
                                        </div>

                                        {trade.notes && (
                                            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 mb-3">
                                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Journal Notes</p>
                                                <p className="text-[11px] text-slate-400 italic leading-relaxed whitespace-pre-wrap">
                                                    {trade.notes.split('\n').filter(l => !l.includes('[EXIT CHART]:') && !l.includes('[EXIT PSYCHOLOGY]:')).join('\n').trim() || trade.notes}
                                                </p>
                                            </div>
                                        )}

                                        {trade.exitChartUrl && (
                                            <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50 aspect-video mb-3 flex items-center justify-center">
                                                <img
                                                    src={trade.exitChartUrl}
                                                    alt="Exit Chart"
                                                    className="max-w-full max-h-full object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}

                                        <div className="flex justify-end">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditTrade(trade); }}
                                                className="px-4 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white text-[10px] font-black rounded-lg transition-all border border-indigo-500/20"
                                            >
                                                ✏️ Edit Trade
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Main Calendar ────────────────────────────────────────────────────────────
const Calendar: React.FC<Props> = ({ trades, displayCurrency, onUpdateTrade }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const dailyStats = useMemo(() => {
        const stats: { [key: number]: { pnl: number; count: number } } = {};
        trades.forEach(trade => {
            if (trade.status !== TradeStatus.CLOSED) return;
            const tDate = new Date(trade.timestamp);
            if (tDate.getFullYear() === year && tDate.getMonth() === month) {
                const day = tDate.getDate();
                if (!stats[day]) stats[day] = { pnl: 0, count: 0 };
                stats[day].pnl += convert(trade.pnl, trade.currency, displayCurrency);
                stats[day].count += 1;
            }
        });
        return stats;
    }, [trades, year, month, displayCurrency]);

    const currencySymbol = displayCurrency === 'USD' ? '$' : '₹';

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(
                <div key={`empty-${i}`} className="h-16 sm:h-20 md:h-24 bg-slate-800/20 rounded-lg border border-slate-700/20" />
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const stats = dailyStats[day];
            const hasTrades = stats && stats.count > 0;
            const isProfit = hasTrades && stats.pnl >= 0;
            const today = new Date();
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

            let bgClass = "bg-transparent border-slate-700/40 hover:bg-slate-800/40";
            let textClass = "text-slate-300";

            if (hasTrades) {
                bgClass = isProfit
                    ? "bg-emerald-500/90 border-emerald-400 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                    : "bg-rose-500/90 border-rose-400 hover:bg-rose-500 shadow-lg shadow-rose-500/20";
                textClass = "text-white";
            }

            days.push(
                <div
                    key={day}
                    onClick={() => hasTrades && setSelectedDate(day)}
                    className={`h-16 sm:h-20 md:h-24 p-1.5 md:p-2 rounded-lg border flex flex-col justify-between transition-all duration-200 ${hasTrades ? 'cursor-pointer hover:scale-[1.03]' : ''} ${bgClass} ${isToday && !hasTrades ? 'ring-1 ring-indigo-500/50' : ''}`}
                >
                    <div className={`text-[10px] md:text-xs font-bold ${hasTrades ? 'text-white/80' : isToday ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {day.toString().padStart(2, '0')}
                    </div>
                    {hasTrades && (
                        <div className="flex flex-col gap-0.5">
                            <div className={`text-[9px] sm:text-[11px] md:text-sm font-black truncate ${textClass}`}>
                                {currencySymbol}{stats.pnl.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className={`text-[8px] md:text-[10px] ${isProfit ? 'text-emerald-100/70' : 'text-rose-100/70'} font-medium hidden sm:block`}>
                                {stats.count} trade{stats.count > 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="space-y-4">
            {/* P&L Graph */}
            <PnLGraph trades={trades} displayCurrency={displayCurrency} year={year} month={month} />

            {/* Calendar */}
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
                {/* Calendar Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-base font-black text-slate-200">Trading Calendar</span>
                    </div>

                    <div className="flex items-center bg-slate-900/60 rounded-xl border border-slate-700/50 p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="min-w-[130px] text-center text-sm font-black text-slate-200 px-3">
                            {monthNames[month]} {year}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-2">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-wider text-center">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                    {renderDays()}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-emerald-500/90 rounded-sm" />
                        <span className="text-[10px] text-slate-500">Profit day</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-rose-500/90 rounded-sm" />
                        <span className="text-[10px] text-slate-500">Loss day</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border border-slate-600 rounded-sm" />
                        <span className="text-[10px] text-slate-500">No trades</span>
                    </div>
                </div>
            </div>

            {/* Day Detail Modal */}
            {selectedDate && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedDate(null)}
                >
                    <div
                        className="bg-slate-800 border border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    Trades on {selectedDate} {monthNames[month]} {year}
                                </h3>
                                <p className="text-slate-400 text-sm mt-0.5">
                                    {trades.filter(t => {
                                        const d = new Date(t.timestamp);
                                        return d.getDate() === selectedDate && d.getMonth() === month && d.getFullYear() === year && t.status === TradeStatus.CLOSED;
                                    }).length} closed trades
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                            {trades
                                .filter(t => {
                                    const d = new Date(t.timestamp);
                                    return d.getDate() === selectedDate && d.getMonth() === month && d.getFullYear() === year && t.status === TradeStatus.CLOSED;
                                })
                                .map(trade => {
                                    const pnl = convert(trade.pnl, trade.currency, displayCurrency);
                                    const isProfit = pnl >= 0;
                                    return (
                                        <div key={trade.id} className={`bg-slate-900/80 border rounded-xl p-4 ${isProfit ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black text-white">{trade.symbol}</span>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase ${trade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                        {trade.type}
                                                    </span>
                                                </div>
                                                <div className={`text-right ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    <p className="text-lg font-black">{isProfit ? '+' : ''}{currencySymbol}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                                    <p className="text-[9px] opacity-70">REALIZED P&L</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                <div><p className="text-[9px] text-slate-500 uppercase font-bold">Entry</p><p className="text-slate-200">{currencySymbol}{trade.entryPrice.toLocaleString()}</p></div>
                                                <div><p className="text-[9px] text-slate-500 uppercase font-bold">Exit</p><p className="text-slate-200">{trade.exitPrice ? `${currencySymbol}${trade.exitPrice.toLocaleString()}` : '—'}</p></div>
                                                <div><p className="text-[9px] text-slate-500 uppercase font-bold">Stop</p><p className="text-rose-400">{currencySymbol}{trade.stopLoss.toLocaleString()}</p></div>
                                                <div><p className="text-[9px] text-slate-500 uppercase font-bold">Target</p><p className="text-emerald-400">{currencySymbol}{trade.target.toLocaleString()}</p></div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
                                                <span>{emotionEmoji[trade.entryEmotion]} {trade.entryEmotion}</span>
                                                {trade.exitEmotion && <span>→ {emotionEmoji[trade.exitEmotion]} {trade.exitEmotion}</span>}
                                            </div>
                                            {trade.notes && (
                                                <p className="mt-2 text-[10px] text-slate-500 italic bg-slate-800/50 rounded-lg p-2">
                                                    {trade.notes.split('\n').filter(l => !l.includes('[EXIT CHART]:') && !l.includes('[EXIT PSYCHOLOGY]:')).join('\n').trim() || trade.notes}
                                                </p>
                                            )}
                                            <button
                                                onClick={() => { setEditingTrade(trade); setSelectedDate(null); }}
                                                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[10px] font-black rounded-lg border border-slate-700 transition-all"
                                            >
                                                ✏️ Edit
                                            </button>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Closed Journal Section */}
            <ClosedJournal trades={trades} displayCurrency={displayCurrency} onEditTrade={(t) => setEditingTrade(t)} />

            {/* Edit Modal */}
            {editingTrade && (
                <EditTradeModal
                    trade={editingTrade}
                    onSave={(updatedTrade) => {
                        onUpdateTrade(updatedTrade);
                        setEditingTrade(null);
                    }}
                    onCancel={() => setEditingTrade(null)}
                    onChange={(updatedTrade) => setEditingTrade(updatedTrade)}
                />
            )}
        </div>
    );
};

export default Calendar;
