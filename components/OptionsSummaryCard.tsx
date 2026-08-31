import React, { useEffect, useState } from 'react';
import { OptionTrade, TradeStatus } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const OptionsSummaryCard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState<OptionTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('option_trades')
        .select('id, status, net_pnl, roi, option_type, underlying, strike_price, lots, lot_size, timestamp')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(50);
      if (data) {
        setTrades(data.map((t: any) => ({
          id: t.id,
          status: t.status,
          netPnl: t.net_pnl,
          roi: t.roi,
          optionType: t.option_type,
          underlying: t.underlying,
          strikePrice: t.strike_price,
          lots: t.lots,
          lotSize: t.lot_size,
          timestamp: t.timestamp,
        } as any)));
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const closed = trades.filter(t => t.status === TradeStatus.CLOSED);
  const open = trades.filter(t => t.status === TradeStatus.OPEN);
  const wins = closed.filter(t => (t.netPnl || 0) > 0);
  const totalPnl = closed.reduce((s, t) => s + (t.netPnl || 0), 0);
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const todayTrades = closed.filter(t => {
    const d = new Date(t.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayPnl = todayTrades.reduce((s, t) => s + (t.netPnl || 0), 0);

  if (loading) return null;

  return (
    <div
      onClick={() => navigate('/options')}
      className="bg-gradient-to-br from-violet-500/10 to-indigo-600/10 border border-violet-500/20 hover:border-violet-500/40 rounded-3xl p-5 cursor-pointer transition-all duration-300 group hover:shadow-lg hover:shadow-violet-500/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest">Options Chain</p>
            <p className="text-[9px] text-slate-500">CE / PE • Indian Market</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-slate-500 text-xs">No options trades yet</p>
          <p className="text-violet-400 text-[10px] mt-1 font-bold">Click to start logging →</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-900/50 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">Total Net P&L</p>
              <p className={`text-base font-black mt-0.5 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">Win Rate</p>
              <p className={`text-base font-black mt-0.5 ${winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {winRate.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">{closed.length} closed</span>
              {open.length > 0 && (
                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold">{open.length} open</span>
              )}
            </div>
            {todayTrades.length > 0 && (
              <span className={`font-bold ${todayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Today: {todayPnl >= 0 ? '+' : ''}{fmt(todayPnl)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OptionsSummaryCard;
