import React, { useMemo, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { Trade, TradeStatus, Currency, Emotion } from '../types';

interface AnalyticsProps {
    trades: Trade[];
    displayCurrency: Currency;
}

type TimeRange = '1D' | '7D' | '30D' | 'YTD' | 'ALL';

const Analytics: React.FC<AnalyticsProps> = ({ trades, displayCurrency }) => {
    const [range, setRange] = useState<TimeRange>('ALL');
    const currencySymbol = displayCurrency === 'USD' ? '$' : '₹';

    // Compute filtered trades based on time range
    const filteredTrades = useMemo(() => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        return [...trades]
            .filter(t => {
                if (range === 'ALL') return true;
                if (range === '1D') return t.timestamp > now - oneDay;
                if (range === '7D') return t.timestamp > now - 7 * oneDay;
                if (range === '30D') return t.timestamp > now - 30 * oneDay;
                if (range === 'YTD') {
                    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
                    return t.timestamp > startOfYear;
                }
                return true;
            })
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [trades, range]);

    // Compute Equity Curve data
    const equityData = useMemo(() => {
        const closedTrades = filteredTrades
            .filter(t => t.status === TradeStatus.CLOSED && t.pnl !== undefined);

        let cumulativePnl = 0;
        return closedTrades.map((trade, index) => {
            cumulativePnl += trade.pnl || 0;
            return {
                name: `T${index + 1}`,
                pnl: cumulativePnl,
                individual: trade.pnl
            };
        });
    }, [filteredTrades]);

    if (trades.length === 0) return null;

    return (
        <div className="w-full h-full  space-y-6">
            <div className="bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl h-full  border border-slate-700/50 shadow-2xl">
                <div className="flex flex-col gap-6 mb-10">
                    <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-white tracking-tight">Equity Curve</h3>
                        <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-tight opacity-70">Growth progression across closed positions</p>
                    </div>

                    <div className="flex items-center p-1 bg-slate-900/40 rounded-2xl border border-slate-700/50 w-fit h-fit backdrop-blur-xl">
                        {(['1D', '7D', '30D', 'YTD', 'ALL'] as TimeRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${range === r
                                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[280px] w-full min-h-[280px]">
                    {equityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={equityData}>

                                <defs>
                                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${currencySymbol}${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any) => [`${currencySymbol}${value.toFixed(2)}`, 'Cumulative PnL']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="pnl"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorPnl)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 text-xs uppercase tracking-widest font-bold opacity-50">No closed trades to analyze</div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Analytics;
