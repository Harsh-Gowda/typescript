
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Trade, Currency } from '../types';

interface Props {
  trades: Trade[];
  displayCurrency: Currency;
}

const AIInsights: React.FC<Props> = ({ trades, displayCurrency }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    if (trades.length === 0) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const tradeDataSummary = trades.map(t => ({
        symbol: t.symbol,
        type: t.type,
        pnl: t.pnl || 0,
        currency: t.currency,
        inEmotion: t.entryEmotion,
        outEmotion: t.exitEmotion,
        notes: t.notes
      }));

      const prompt = `Analyze my recent trading history, strategy logic, and psychology based on the following data:
        ${JSON.stringify(tradeDataSummary)}
        
        The user's preferred display currency is ${displayCurrency}. 
        
        Please provide a deep dive analysis into:
        1. **Contextual Psychology**: Correlate notes (setup logic) with 'In/Out Emotions'. Do I tend to get 'Fearful' on specific setups?
        2. **Financial-Qualitative Correlation**: How do setups described in notes perform financially (accounting for USD/INR variations)?
        3. **Actionable Growth Plan**: Provide 3 specific tips. One for strategy refinement, and two for psychological management.
        
        Ensure all currency references in your response use the user's preferred currency (${displayCurrency}) where appropriate.
        Keep the tone professional and data-driven. Use markdown formatting.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setInsight(response.text || "No insights available at this time.");
    } catch (error) {
      console.error(error);
      setInsight("Failed to load AI insights. Check your connection or API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col h-full shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold">Psychological Edge</h3>
      </div>

      <p className="text-slate-400 text-xs mb-6 font-medium leading-relaxed">
        Gemini will analyze your emotional states, setup notes, and financial outcomes (in {displayCurrency}) to find patterns.
      </p>

      {insight ? (
        <div className="flex-1 overflow-y-auto max-h-[400px] text-slate-300 custom-scrollbar">
          <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap">{insight}</div>
          </div>
          <button
            onClick={() => setInsight(null)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold mt-6 pb-2 block uppercase tracking-widest"
          >
            ← Reset Analysis
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-700/50 mb-4 border border-slate-600/50">
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Awaiting Data Points</p>
          </div>
          <button
            disabled={loading || trades.length < 3}
            onClick={generateInsights}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-tighter transition-all ${loading || trades.length < 3
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/25 text-white shadow-lg'
              }`}
          >
            {loading ? 'Processing...' : trades.length < 3 ? `Need ${3 - trades.length} more trades` : 'Generate Insights'}
          </button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-700">
        <div className="flex justify-between items-center text-[9px] font-black tracking-widest uppercase opacity-40">
          <span>Gemini 3 Flash</span>
          <span className="text-indigo-400">Multi-Currency V2</span>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
