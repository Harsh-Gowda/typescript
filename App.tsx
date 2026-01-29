
import React, { useState, useEffect } from 'react';
import { Trade, TradeStatus, Emotion, Currency } from './types';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import MarketCalendar from './components/MarketCalendar';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import Analytics from './components/Analytics';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';

const TradeJournal: React.FC = () => {
  const { signOut, user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('trademind_currency') as Currency) || 'USD';
  });
  const [isAdding, setIsAdding] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'market'>('dashboard');

  useEffect(() => {
    localStorage.setItem('trademind_currency', displayCurrency);
  }, [displayCurrency]);

  const fetchTrades = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching trades:', error);
      return;
    }

    if (data) {
      const mappedTrades: Trade[] = data.map((t: any) => ({
        id: t.id,
        symbol: t.symbol,
        type: t.type,
        entryPrice: t.entry_price,
        exitPrice: t.exit_price,
        stopLoss: t.stop_loss,
        target: t.target,
        status: t.status,
        pnl: t.pnl,
        entryEmotion: t.entry_emotion,
        exitEmotion: t.exit_emotion,
        notes: t.notes,
        timestamp: Number(t.timestamp),
        currency: t.currency || 'USD',
        exitChartUrl: t.notes?.includes('[EXIT CHART]: ')
          ? t.notes.split('[EXIT CHART]: ')[1].split('\n')[0].trim()
          : undefined
      }));
      setTrades(mappedTrades);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [user]);

  const addTrade = async (trade: Omit<Trade, 'id' | 'timestamp' | 'status'>) => {
    if (!user) return;

    const newTradeSDK = {
      user_id: user.id,
      symbol: trade.symbol,
      type: trade.type,
      entry_price: trade.entryPrice,
      stop_loss: trade.stopLoss,
      target: trade.target,
      status: TradeStatus.OPEN,
      entry_emotion: trade.entryEmotion,
      notes: trade.notes,
      currency: trade.currency,
      timestamp: Date.now(),
      pnl: 0
    };

    const { error } = await supabase.from('trades').insert(newTradeSDK);

    if (error) {
      console.error('Error adding trade:', error);
      alert('Failed to save trade. Check console.');
    } else {
      setIsAdding(false);
      fetchTrades();
    }
  };

  const updateTrade = async (updatedTrade: Trade) => {
    if (!user) return;

    const { error } = await supabase
      .from('trades')
      .update({
        symbol: updatedTrade.symbol,
        type: updatedTrade.type,
        entry_price: updatedTrade.entryPrice,
        stop_loss: updatedTrade.stopLoss,
        target: updatedTrade.target,
        notes: updatedTrade.notes,
        currency: updatedTrade.currency
      })
      .eq('id', updatedTrade.id);

    if (error) {
      console.error('Error updating trade:', error);
    } else {
      fetchTrades();
    }
  };

  const closeTrade = async (id: string, exitPrice: number, exitEmotion: Emotion, manualPnL?: number, exitNotes?: string, exitChartUrl?: string) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    let finalNotes = trade.notes || '';
    if (exitNotes) {
      finalNotes += (finalNotes ? '\n\n' : '') + `[EXIT PSYCHOLOGY]: ${exitNotes}`;
    }

    if (exitChartUrl) {
      finalNotes += (finalNotes ? '\n\n' : '') + `[EXIT CHART]: ${exitChartUrl}`;
    }

    const pnl = manualPnL !== undefined ? manualPnL : (trade.type === 'Long' ? (exitPrice - trade.entryPrice) : (trade.entryPrice - exitPrice));

    const { error } = await supabase
      .from('trades')
      .update({
        exit_price: exitPrice,
        exit_emotion: exitEmotion,
        notes: finalNotes,
        status: TradeStatus.CLOSED,
        pnl: pnl
      })
      .eq('id', id);

    if (error) {
      console.error('Error closing trade:', error);
      alert('Failed to close trade: ' + error.message);
    } else {
      fetchTrades();
    }
  };

  const deleteTrade = async (id: string) => {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) {
      console.error('Error deleting trade:', error);
    } else {
      fetchTrades();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* Sidebar Navigation - Desktop Only */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 bg-slate-900/50 border-r border-slate-800/50 backdrop-blur-xl flex-col transition-all duration-500 z-40">
        {/* Logo Section */}
        <div className="p-8 flex items-center gap-4 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative p-3 bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl transition-transform duration-500 group-hover:scale-110">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
              TradeMind
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Harsh Design</span>
            </div>
          </div>
        </div>

        {/* Global Action */}
        <div className="px-6 mb-8 w-full">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-600/20 active:scale-95 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <svg className={`w-5 h-5 transition-transform duration-300 ${isAdding ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="text-xs font-black uppercase tracking-widest">{isAdding ? 'Dashboard' : 'New Entry'}</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-2">
          <div className="px-4 mb-2">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Main Journal</p>
          </div>
          {[
            { id: 'dashboard', name: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
            { id: 'market', name: 'Market Calendar', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> }
          ].map(item => (
            <div
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as any);
                setIsAdding(false);
              }}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group ${currentView === item.id && !isAdding ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'}`}
            >
              <div className="shrink-0 group-hover:scale-110 transition-transform">{item.icon}</div>
              <span className="text-[11px] font-bold uppercase tracking-wider">{item.name}</span>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-1 flex justify-between items-center group">
            <div className="flex">
              {(['USD', 'INR'] as Currency[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setDisplayCurrency(curr)}
                  className={`px-4 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all duration-300 ${displayCurrency === curr
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {curr}
                </button>
              ))}
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-500 hover:text-rose-400 transition-colors" title="Sign Out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
            </button>
          </div>

          <div className="flex items-center gap-3 p-2 bg-indigo-600/5 rounded-2xl border border-indigo-500/10">
            <div className="w-10 h-10 shrink-0 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-black border border-indigo-500/20">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-white truncate uppercase tracking-widest">{user?.email?.split('@')[0]}</p>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Operative</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative h-[calc(100vh-80px)] lg:h-screen pb-20 lg:pb-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-slate-900/50 border-b border-slate-800/50 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl border border-slate-700/50">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">TradeMind</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Harsh Design</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800/50 p-0.5 rounded-lg border border-slate-700/50">
              {(['USD', 'INR'] as Currency[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setDisplayCurrency(curr)}
                  className={`px-2 py-1 text-[8px] font-black tracking-widest rounded-md transition-all ${displayCurrency === curr
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-500'
                    }`}
                >
                  {curr}
                </button>
              ))}
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
            </button>
          </div>
        </header>

        <div className="w-full px-6 lg:px-10 py-6 lg:py-10 relative z-10">
          {isAdding ? (
            <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              <div className="flex justify-between items-center bg-slate-900/40 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/30 backdrop-blur-xl">
                <div>
                  <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight">Log New Position</h2>
                  <p className="text-slate-500 text-[10px] lg:text-xs mt-1 font-medium tracking-wide">Record your strategy and emotional state.</p>
                </div>
              </div>
              <TradeForm
                onSubmit={addTrade}
                onCancel={() => setIsAdding(false)}
                defaultCurrency={displayCurrency}
              />
            </div>
          ) : currentView === 'dashboard' ? (
            <div className="w-full space-y-8 lg:space-y-12 animate-in fade-in duration-500">
              <Dashboard trades={trades} displayCurrency={displayCurrency} />
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
                <div className="xl:col-span-8">
                  <TradeList
                    trades={trades}
                    displayCurrency={displayCurrency}
                    onCloseTrade={closeTrade}
                    onDeleteTrade={deleteTrade}
                    onUpdateTrade={updateTrade}
                  />
                </div>
                <div className="xl:col-span-4">
                  <Analytics trades={trades} displayCurrency={displayCurrency} />
                </div>
                <div className="w-full xl:col-span-12">
                  <Calendar trades={trades} displayCurrency={displayCurrency} />
                </div>
              </div>
            </div>
          ) : (
            <MarketCalendar />
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-2xl border-t border-slate-800/50 px-6 py-3 flex items-center justify-between z-40">
          <button
            onClick={() => { setCurrentView('dashboard'); setIsAdding(false); }}
            className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' && !isAdding ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            <span className="text-[10px] font-black uppercase tracking-tighter">Dashboard</span>
          </button>
          <div className="relative -mt-12">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-[0_8px_25px_rgba(79,70,229,0.4)] flex items-center justify-center text-white active:scale-90 transition-transform border-4 border-[#0f172a]">
              <svg className={`w-6 h-6 transition-transform duration-300 ${isAdding ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <button
            onClick={() => { setCurrentView('market'); setIsAdding(false); }}
            className={`flex flex-col items-center gap-1 ${currentView === 'market' && !isAdding ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[10px] font-black uppercase tracking-tighter">Events</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <TradeJournal />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
