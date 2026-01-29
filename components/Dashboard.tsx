import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus, Currency } from '../types';

interface Props {
  trades: Trade[];
  displayCurrency: Currency;
}

type TimeRange = '1d' | '7d' | '30d' | 'ytd' | 'all';

// Mock conversion rate
const CONVERSION_RATE = 83.5;

const convert = (value: number | undefined, from: Currency, to: Currency) => {
  if (!value) return 0;
  if (from === to) return value;
  return to === 'INR' ? value * CONVERSION_RATE : value / CONVERSION_RATE;
};

const Dashboard: React.FC<Props> = ({ trades, displayCurrency }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const currencySymbol = displayCurrency === 'USD' ? '$' : '₹';

  const filterButtons: { label: string, value: TimeRange }[] = [
    { label: '1D', value: '1d' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: 'YTD', value: 'ytd' },
    { label: 'ALL', value: 'all' },
  ];

  const filteredTrades = useMemo(() => {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    return trades.filter(t => {
      // Filter by open/closed isn't strictly necessary for ALL stats, 
      // but usually dashboard stats focus on CLOSED trades for PnL/Winrate 
      // and ALL trades for "Active" count.
      // We'll return ALL trades here matching the date range, 
      // then sub-filter for close/open below.

      if (timeRange === 'all') return true;
      if (timeRange === '1d') return t.timestamp > now - dayInMs;
      if (timeRange === '7d') return t.timestamp > now - (7 * dayInMs);
      if (timeRange === '30d') return t.timestamp > now - (30 * dayInMs);
      if (timeRange === 'ytd') {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
        return t.timestamp > startOfYear;
      }
      return true;
    });
  }, [trades, timeRange]);

  const closedTrades = useMemo(() => filteredTrades.filter(t => t.status === TradeStatus.CLOSED), [filteredTrades]);

  const totalPnL = useMemo(() => closedTrades.reduce((sum, t) => {
    return sum + convert(t.pnl, t.currency, displayCurrency);
  }, 0), [closedTrades, displayCurrency]);

  const winRate = useMemo(() => closedTrades.length > 0
    ? (closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100
    : 0, [closedTrades]);

  const avgRMultiple = useMemo(() => closedTrades.length > 0
    ? (closedTrades.reduce((sum, t) => {
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      const multiple = risk > 0 ? (t.pnl || 0) / risk : 0;
      return sum + multiple;
    }, 0) / closedTrades.length)
    : 0, [closedTrades]);

  const activeTradesCount = useMemo(() => filteredTrades.filter(t => t.status === TradeStatus.OPEN).length, [filteredTrades]);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-end">
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setTimeRange(btn.value)}
              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${timeRange === btn.value
                ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        {/* Total PnL Card */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500"></div>
          <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
            <div className={`p-1.5 lg:p-2 rounded-xl border ${totalPnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
              <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-slate-500 text-[8px] lg:text-[10px] font-black uppercase tracking-wider">Total PnL</p>
          </div>
          <p className={`text-xl lg:text-2xl font-black tracking-tight truncate ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currencySymbol}{totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Win Rate Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500"></div>
          <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
            <div className="p-1.5 lg:p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-slate-500 text-[8px] lg:text-[10px] font-black uppercase tracking-wider">Win Rate</p>
          </div>
          <p className="text-xl lg:text-2xl font-black tracking-tight text-blue-400">{winRate.toFixed(1)}%</p>
        </div>

        {/* Avg R Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500"></div>
          <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
            <div className="p-1.5 lg:p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <p className="text-slate-500 text-[8px] lg:text-[10px] font-black uppercase tracking-wider">Avg R-Mult</p>
          </div>
          <p className={`text-xl lg:text-2xl font-black tracking-tight ${avgRMultiple >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
            {avgRMultiple.toFixed(2)}R
          </p>
        </div>

        {/* Total Trades Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group hover:border-slate-500/30 transition-all duration-500">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-500/5 rounded-full blur-3xl group-hover:bg-slate-500/10 transition-all duration-500"></div>
          <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
            <div className="p-1.5 lg:p-2 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-xl">
              <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-slate-500 text-[8px] lg:text-[10px] font-black uppercase tracking-wider">Trades</p>
          </div>
          <p className="text-xl lg:text-2xl font-black tracking-tight text-white">{filteredTrades.length}</p>
        </div>

        {/* Active Trades Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-500">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-500"></div>
          <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
            <div className="p-1.5 lg:p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
              <span className="flex h-1.5 w-1.5 lg:h-2 lg:w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 lg:h-2 lg:w-2 bg-amber-500"></span>
              </span>
            </div>
            <p className="text-slate-500 text-[8px] lg:text-[10px] font-black uppercase tracking-wider">Active</p>
          </div>
          <p className="text-xl lg:text-2xl font-black tracking-tight text-amber-400">
            {activeTradesCount}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
