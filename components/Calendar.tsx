import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus, Currency } from '../types';

interface Props {
    trades: Trade[];
    displayCurrency: Currency;
}

const CONVERSION_RATE = 83.5;

const convert = (value: number | undefined, from: Currency, to: Currency) => {
    if (!value) return 0;
    if (from === to) return value;
    return to === 'INR' ? value * CONVERSION_RATE : value / CONVERSION_RATE;
};

const Calendar: React.FC<Props> = ({ trades, displayCurrency }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<number | null>(null);


    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

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
                if (!stats[day]) {
                    stats[day] = { pnl: 0, count: 0 };
                }
                stats[day].pnl += convert(trade.pnl, trade.currency, displayCurrency);
                stats[day].count += 1;
            }
        });

        return stats;
    }, [trades, year, month, displayCurrency]);

    const currencySymbol = displayCurrency === 'USD' ? '$' : '₹';

    const renderDays = () => {
        const days = [];

        // Padding for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(
                <div key={`empty-${i}`} className="h-20 sm:h-24 md:h-32 bg-slate-800/30 rounded-lg md:rounded-xl border border-slate-700/30"></div>
            );
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const stats = dailyStats[day];
            const hasTrades = stats && stats.count > 0;
            const isProfit = hasTrades && stats.pnl >= 0;

            let bgClass = "bg-transparent border-slate-700 hover:bg-slate-800/50";
            let textClass = "text-slate-300";

            if (hasTrades) {
                if (isProfit) {
                    bgClass = "bg-green-500 border-green-500";
                    textClass = "text-white";
                } else {
                    bgClass = "bg-red-500 border-red-500";
                    textClass = "text-white";
                }
            }

            days.push(
                <div
                    key={day}
                    onClick={() => hasTrades && setSelectedDate(day)}
                    className={`h-20 sm:h-24 md:h-32 p-1 md:p-2 rounded-lg md:rounded-xl border flex flex-col justify-between transition-all ${hasTrades ? 'cursor-pointer hover:scale-[1.02] shadow-sm' : ''} ${bgClass}`}
                >
                    <div className={`text-[10px] md:text-sm font-bold ${hasTrades ? '' : 'text-slate-500'}`}>
                        {day.toString().padStart(2, '0')}
                    </div>

                    {hasTrades && (
                        <div className="flex flex-col gap-0.5 md:gap-1">
                            <div className={`text-[10px] sm:text-xs md:text-base font-bold truncate ${textClass}`}>
                                {currencySymbol}{stats.pnl.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className={`text-[9px] md:text-xs ${isProfit ? 'text-slate-700' : 'text-rose-100'} font-medium hidden sm:block`}>
                                {stats.count} Trades
                            </div>
                            <div className={`text-[9px] md:text-xs ${isProfit ? 'text-slate-700' : 'text-rose-100'} font-medium sm:hidden`}>
                                ({stats.count})
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    return (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-lg font-bold text-slate-200">Calendar</span>
                </div>

                <div className="flex items-center bg-[#0f172a] rounded-lg border border-slate-800 p-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="min-w-[120px] text-center text-sm font-bold text-slate-200 px-4">
                        {monthNames[month]} {year}
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4 mb-2 md:mb-4">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 text-center md:text-left">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4">
                {renderDays()}
            </div>

            {selectedDate && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedDate(null)}
                >
                    <div
                        className="bg-slate-800 border border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    Trades on {selectedDate} {monthNames[month]} {year}
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    {trades.filter(t => {
                                        const d = new Date(t.timestamp);
                                        return d.getDate() === selectedDate && d.getMonth() === month && d.getFullYear() === year && t.status === TradeStatus.CLOSED;
                                    }).length} closed trades
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                            {trades
                                .filter(t => {
                                    const d = new Date(t.timestamp);
                                    return d.getDate() === selectedDate && d.getMonth() === month && d.getFullYear() === year && t.status === TradeStatus.CLOSED;
                                })
                                .map(trade => (
                                    <div key={trade.id} className="bg-[#0f172a] border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/50 transition-colors group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-white">{trade.symbol}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${trade.type === 'Long' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                        }`}>
                                                        {trade.type}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${trade.pnl && trade.pnl >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                                                    {trade.pnl && trade.pnl >= 0 ? '+' : ''}
                                                    {currencySymbol}{Math.abs(convert(trade.pnl, trade.currency, displayCurrency)).toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium">REALIZED P&L</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-slate-700/30">
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Entry</div>
                                                <div className="text-sm font-semibold text-slate-200">{currencySymbol}{trade.entryPrice.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Exit</div>
                                                <div className="text-sm font-semibold text-slate-200">{trade.exitPrice ? `${currencySymbol}${trade.exitPrice.toLocaleString()}` : '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Stop Loss</div>
                                                <div className="text-sm font-semibold text-rose-400/80">{currencySymbol}{trade.stopLoss.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Target</div>
                                                <div className="text-sm font-semibold text-green-400/80">{currencySymbol}{trade.target.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Entry:</span>
                                                <span className="text-xs text-indigo-400 font-medium">{trade.entryEmotion}</span>
                                            </div>
                                            {trade.exitEmotion && (
                                                <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Exit:</span>
                                                    <span className="text-xs text-purple-400 font-medium">{trade.exitEmotion}</span>
                                                </div>
                                            )}
                                        </div>

                                        {(trade.notes || trade.exitChartUrl) && (
                                            <div className="mt-3 space-y-3">
                                                {trade.exitChartUrl && (
                                                    <div className="relative group/chart">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-2">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            Exit Chart
                                                        </div>
                                                        <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50 aspect-video flex items-center justify-center">
                                                            <img
                                                                src={trade.exitChartUrl}
                                                                alt="Exit Chart"
                                                                className="max-w-full max-h-full object-contain"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                            <a
                                                                href={trade.exitChartUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/chart:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]"
                                                            >
                                                                <span className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md">View Full Image</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}

                                                {trade.notes && (
                                                    <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Trade Journal / Psychology:</div>
                                                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                            {trade.notes
                                                                .split('\n')
                                                                .filter(line => !line.includes('[EXIT CHART]:') && !line.includes('[EXIT PSYCHOLOGY]:'))
                                                                .join('\n')
                                                                .trim() || trade.notes}
                                                        </p>

                                                        {trade.notes.includes('[EXIT PSYCHOLOGY]:') && (
                                                            <div className="mt-2 pt-2 border-t border-slate-700/30">
                                                                <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Exit Log:</div>
                                                                <p className="text-[11px] text-slate-400 italic">
                                                                    {trade.notes.split('[EXIT PSYCHOLOGY]:')[1].split('\n')[0].trim()}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
};

export default Calendar;
