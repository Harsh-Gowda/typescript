
import React, { useState, useEffect } from 'react';
import { Trade, TradeStatus, Emotion, Currency } from './types';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import AIInsights from './components/AIInsights';
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
        currency: t.currency || 'USD'
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

  const closeTrade = async (id: string, exitPrice: number, exitEmotion: Emotion, manualPnL?: number) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    const pnl = manualPnL !== undefined ? manualPnL : (trade.type === 'Long' ? (exitPrice - trade.entryPrice) : (trade.entryPrice - exitPrice));

    const { error } = await supabase
      .from('trades')
      .update({
        exit_price: exitPrice,
        exit_emotion: exitEmotion,
        status: TradeStatus.CLOSED,
        pnl: pnl
      })
      .eq('id', id);

    if (error) {
      console.error('Error closing trade:', error);
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center mb-8">
        <div className="text-center md:text-left flex flex-col md:flex-row items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <img src="/logo.svg" alt="TradeMind Logo" className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              TradeMind
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">Elevate your edge through data & psychology.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full md:w-auto">
          {/* Mobile User Email Display */}
          <div className="md:hidden text-center text-xs text-slate-500 mb-[-8px]">
            {user?.email}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 w-full">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0">
              {(['USD', 'INR'] as Currency[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setDisplayCurrency(curr)}
                  className={`px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${displayCurrency === curr
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 whitespace-nowrap"
              >
                {isAdding ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <span>Dashboard</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span>Log Trade</span>
                  </>
                )}
              </button>

              <button
                onClick={() => signOut()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl transition-all border border-slate-700 flex items-center justify-center"
                title="Sign Out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
          <div className="hidden md:block text-right text-xs text-slate-500 mt-1">
            {user?.email}
          </div>
        </div>
      </header>

      <main className="space-y-8">
        {!isAdding ? (
          <>
            <Dashboard trades={trades} displayCurrency={displayCurrency} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <TradeList
                  trades={trades}
                  displayCurrency={displayCurrency}
                  onCloseTrade={closeTrade}
                  onDeleteTrade={deleteTrade}
                  onUpdateTrade={updateTrade}
                />
              </div>
              <div className="lg:col-span-1">
                <AIInsights trades={trades} displayCurrency={displayCurrency} />
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-2xl mx-auto">
            <TradeForm
              onSubmit={addTrade}
              onCancel={() => setIsAdding(false)}
              defaultCurrency={displayCurrency}
            />
          </div>
        )}
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
