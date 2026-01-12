
import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus, Currency } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Props {
  trades: Trade[];
  displayCurrency: Currency;
}

type TimeRange = '7d' | '30d' | 'ytd' | 'all';

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

  const filteredTrades = useMemo(() => {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return trades.filter(t => {
      if (timeRange === 'all') return true;
      if (timeRange === '7d') return t.timestamp > now - (7 * dayInMs);
      if (timeRange === '30d') return t.timestamp > now - (30 * dayInMs);
      if (timeRange === 'ytd') {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
        return t.timestamp > startOfYear;
      }
      return true;
    });
  }, [trades, timeRange]);

  const closedTrades = filteredTrades.filter(t => t.status === TradeStatus.CLOSED);
  
  const totalPnL = closedTrades.reduce((sum, t) => {
    return sum + convert(t.pnl, t.currency, displayCurrency);
  }, 0);

  const winRate = closedTrades.length > 0 
    ? (closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100 
    : 0;

  const avgRMultiple = closedTrades.length > 0 
    ? (closedTrades.reduce((sum, t) => {
        const risk = Math.abs(t.entryPrice - t.stopLoss);
        const multiple = risk > 0 ? (t.pnl || 0) / risk : 0;
        return sum + multiple;
      }, 0) / closedTrades.length)
    : 0;

  const chartData = [...closedTrades]
    .sort((a, b) => a.timestamp - b.timestamp)
    .reduce((acc: any[], trade) => {
      const convertedPnL = convert(trade.pnl, trade.currency, displayCurrency);
      const prevTotal = acc.length > 0 ? acc[acc.length - 1].total : 0;
      acc.push({
        date: new Date(trade.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        pnl: convertedPnL,
        total: prevTotal + convertedPnL
      });
      return acc;
    }, []);

  const filterButtons: { label: string, value: TimeRange }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: 'YTD', value: 'ytd' },
    { label: 'ALL', value: 'all' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
        <p className="text-slate-400 text-xs mb-1 font-bold uppercase tracking-widest">Total PnL</p>
        <p className={`text-xl font-bold truncate ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {currencySymbol}{totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
        <p className="text-slate-400 text-xs mb-1 font-bold uppercase tracking-widest">Win Rate</p>
        <p className="text-xl font-bold text-blue-400">{winRate.toFixed(1)}%</p>
      </div>
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
        <p className="text-slate-400 text-xs mb-1 font-bold uppercase tracking-widest">Avg R</p>
        <p className={`text-xl font-bold ${avgRMultiple >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
          {avgRMultiple.toFixed(2)}R
        </p>
      </div>
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
        <p className="text-slate-400 text-xs mb-1 font-bold uppercase tracking-widest">Trades</p>
        <p className="text-xl font-bold">{filteredTrades.length}</p>
      </div>
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
        <p className="text-slate-400 text-xs mb-1 font-bold uppercase tracking-widest">Active</p>
        <p className="text-xl font-bold text-amber-400">
          {filteredTrades.filter(t => t.status === TradeStatus.OPEN).length}
        </p>
      </div>

      <div className="md:col-span-5 bg-slate-800 p-6 rounded-2xl border border-slate-700 h-[380px] flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Equity Curve ({displayCurrency})
          </h3>
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setTimeRange(btn.value)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  timeRange === btn.value 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${currencySymbol}${val}`} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }}
                itemStyle={{ color: '#818cf8' }}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                formatter={(value: any) => [`${currencySymbol}${value.toFixed(2)}`, 'Balance']}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#6366f1" 
                fillOpacity={1} 
                fill="url(#colorPnL)" 
                strokeWidth={3}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
