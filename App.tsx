
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            TradeMind
          </h1>
          <p className="text-slate-400 text-sm">Elevate your edge through data & psychology.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="hidden md:block text-sm text-slate-400 mr-2">
            {user?.email}
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            {(['USD', 'INR'] as Currency[]).map((curr) => (
              <button
                key={curr}
                onClick={() => setDisplayCurrency(curr)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${displayCurrency === curr
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {curr}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            {isAdding ? 'Dashboard' : '+ Log Trade'}
          </button>
          <button
            onClick={() => signOut()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-medium transition-all border border-slate-700"
          >
            Sign Out
          </button>
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
