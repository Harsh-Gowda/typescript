
import React, { useState, useEffect } from 'react';
import { Trade, TradeStatus, Emotion, Currency } from './types';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import AIInsights from './components/AIInsights';

const App: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem('trademind_trades');
    return saved ? JSON.parse(saved) : [];
  });
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('trademind_currency') as Currency) || 'USD';
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    localStorage.setItem('trademind_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('trademind_currency', displayCurrency);
  }, [displayCurrency]);

  const addTrade = (trade: Omit<Trade, 'id' | 'timestamp' | 'status'>) => {
    const newTrade: Trade = {
      ...trade,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: TradeStatus.OPEN,
      pnl: 0
    };
    setTrades([newTrade, ...trades]);
    setIsAdding(false);
  };

  const updateTrade = (updatedTrade: Trade) => {
    setTrades(prev => prev.map(t => {
      if (t.id === updatedTrade.id) {
        return { ...updatedTrade };
      }
      return t;
    }));
  };

  const closeTrade = (id: string, exitPrice: number, exitEmotion: Emotion, manualPnL?: number) => {
    setTrades(prev => prev.map(t => {
      if (t.id === id) {
        // If manualPnL is provided, use it; otherwise calculate based on prices
        const pnl = manualPnL !== undefined ? manualPnL : (t.type === 'Long' ? (exitPrice - t.entryPrice) : (t.entryPrice - exitPrice));
        return { ...t, exitPrice, exitEmotion, status: TradeStatus.CLOSED, pnl };
      }
      return t;
    }));
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
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
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            {(['USD', 'INR'] as Currency[]).map((curr) => (
              <button
                key={curr}
                onClick={() => setDisplayCurrency(curr)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  displayCurrency === curr 
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

export default App;
