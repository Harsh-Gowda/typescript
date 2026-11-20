import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Strategy, StrategyMarket, StrategyTrend, StrategyTimeframe, STRATEGY_TIMEFRAMES, PRESET_STRATEGY_NAMES } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-in slide-in-from-top-4 duration-300 ${type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
      <span className="text-lg">{type === 'success' ? '✓' : '✕'}</span>
      <span className="text-xs font-bold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
const DeleteConfirmModal: React.FC<{ strategyName: string; onConfirm: () => void; onCancel: () => void }> = ({ strategyName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="w-14 h-14 mx-auto mb-5 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-center">
        <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </div>
      <h3 className="text-lg font-black text-white text-center mb-2">Delete Strategy?</h3>
      <p className="text-slate-400 text-sm text-center mb-6">
        Are you sure you want to delete <span className="text-white font-bold">"{strategyName}"</span>? This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm transition-all">Delete</button>
      </div>
    </div>
  </div>
);

// ─── Image Lightbox ───────────────────────────────────────────────────────────
const ImageLightbox: React.FC<{ urls: string[]; initialIndex: number; onClose: () => void }> = ({ urls, initialIndex, onClose }) => {
  const [idx, setIdx] = useState(initialIndex);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-5xl w-full max-h-screen p-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 z-10 w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all">✕</button>
        {urls.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + urls.length) % urls.length)} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-slate-800/80 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-all">‹</button>
            <button onClick={() => setIdx(i => (i + 1) % urls.length)} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-slate-800/80 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-all">›</button>
          </>
        )}
        <img src={urls[idx]} alt={`Chart ${idx + 1}`} className="max-h-[85vh] w-full object-contain rounded-2xl" />
        {urls.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {urls.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-indigo-400 w-5' : 'bg-slate-600'}`} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Timeframe Multi-Select ───────────────────────────────────────────────────
const TimeframeSelect: React.FC<{ selected: StrategyTimeframe[]; onChange: (tfs: StrategyTimeframe[]) => void }> = ({ selected, onChange }) => {
  const toggle = (tf: StrategyTimeframe) => {
    if (selected.includes(tf)) onChange(selected.filter(t => t !== tf));
    else onChange([...selected, tf]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {STRATEGY_TIMEFRAMES.map(tf => (
        <button key={tf} type="button" onClick={() => toggle(tf)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${selected.includes(tf) ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'}`}>
          {tf}
        </button>
      ))}
    </div>
  );
};

// ─── Strategy Form Modal ──────────────────────────────────────────────────────
interface FormModalProps {
  initial?: Strategy;
  onSave: (data: Omit<Strategy, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { imageFiles?: File[] }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const MARKETS: StrategyMarket[] = ['Indian', 'Forex', 'Crypto'];
const TRENDS: StrategyTrend[] = ['Uptrend', 'Downtrend', 'Sideways'];

const StrategyFormModal: React.FC<FormModalProps> = ({ initial, onSave, onClose, saving }) => {
  const [name, setName] = useState(initial?.name || '');
  const [customName, setCustomName] = useState(!initial || PRESET_STRATEGY_NAMES.includes(initial.name) ? '' : initial.name);
  const [useCustom, setUseCustom] = useState(initial ? !PRESET_STRATEGY_NAMES.includes(initial.name) : false);
  const [market, setMarket] = useState<StrategyMarket>(initial?.market || 'Indian');
  const [trend, setTrend] = useState<StrategyTrend>(initial?.trend || 'Uptrend');
  const [timeframes, setTimeframes] = useState<StrategyTimeframe[]>(initial?.timeframes || []);
  const [explanation, setExplanation] = useState(initial?.explanation || '');
  const [existingImageUrls] = useState<string[]>(initial?.image_urls || []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const finalName = useCustom ? customName.trim() : name;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setNewImages(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviewUrls(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeNewImage = (i: number) => {
    setNewImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalName.trim()) return;
    if (timeframes.length === 0) return;
    await onSave({ name: finalName.trim(), market, trend, timeframes, explanation, image_urls: existingImageUrls, imageFiles: newImages });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-[#0f172a]/95 backdrop-blur-xl border-b border-slate-800/50 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-black text-white">{initial ? 'Edit Strategy' : 'Add Strategy'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Document your trading setup</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Strategy Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategy Name</label>
            {!useCustom ? (
              <div className="flex gap-2 flex-wrap">
                {PRESET_STRATEGY_NAMES.map(n => (
                  <button key={n} type="button" onClick={() => setName(n)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${name === n ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'}`}>
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => { setUseCustom(true); setName(''); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 transition-all">
                  + Custom
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Enter strategy name..."
                  className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" required />
                <button type="button" onClick={() => { setUseCustom(false); setCustomName(''); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300 transition-all">
                  Presets
                </button>
              </div>
            )}
          </div>

          {/* Market + Trend */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Market</label>
              <div className="flex flex-col gap-1.5">
                {MARKETS.map(m => (
                  <button key={m} type="button" onClick={() => setMarket(m)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left ${market === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'}`}>
                    {m === 'Indian' ? '🇮🇳 Indian' : m === 'Forex' ? '💱 Forex' : '₿ Crypto'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trend</label>
              <div className="flex flex-col gap-1.5">
                {TRENDS.map(tr => (
                  <button key={tr} type="button" onClick={() => setTrend(tr)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left ${trend === tr ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'}`}>
                    {tr === 'Uptrend' ? '📈 Uptrend' : tr === 'Downtrend' ? '📉 Downtrend' : '↔ Sideways'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeframes */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timeframes <span className="text-rose-400">*</span></label>
            <TimeframeSelect selected={timeframes} onChange={setTimeframes} />
            {timeframes.length === 0 && <p className="text-[10px] text-rose-400">Select at least one timeframe</p>}
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Explanation</label>
            <p className="text-[9px] text-slate-600">Describe entry rules, exit rules, stop loss placement, and confirmation signals.</p>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={5} placeholder={"Entry: Wait for price to touch EMA and confirm with a bullish candle...\nExit: Take profit at previous swing high...\nStop Loss: Below the last swing low...\nConfirmation: RSI above 50..."}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none" />
          </div>

          {/* Images */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chart Screenshots</label>
            {/* Existing images */}
            {existingImageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {existingImageUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-700/50">
                    <img src={url} alt={`Chart ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <span className="text-xs text-white font-bold">Saved</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* New image previews */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-indigo-500/30">
                    <img src={url} alt={`New ${i + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-all">✕</button>
                  </div>
                ))}
              </div>
            )}
            <input type="file" ref={fileRef} multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl text-slate-500 hover:text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Upload Chart Screenshots
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || !finalName.trim() || timeframes.length === 0}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {initial ? 'Save Changes' : 'Add Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const StrategyDetailModal: React.FC<{
  strategy: Strategy;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ strategy, onEdit, onDelete, onClose }) => {
  const [lightbox, setLightbox] = useState<{ open: boolean; idx: number }>({ open: false, idx: 0 });
  const trendIcon = strategy.trend === 'Uptrend' ? '📈' : strategy.trend === 'Downtrend' ? '📉' : '↔';
  const marketIcon = strategy.market === 'Indian' ? '🇮🇳' : strategy.market === 'Forex' ? '💱' : '₿';

  return (
    <>
      {lightbox.open && <ImageLightbox urls={strategy.image_urls} initialIndex={lightbox.idx} onClose={() => setLightbox({ open: false, idx: 0 })} />}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0f172a] border border-slate-700/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="sticky top-0 bg-[#0f172a]/95 backdrop-blur-xl border-b border-slate-800/50 p-6 z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{marketIcon}</span>
                  <h2 className="text-xl font-black text-white">{strategy.name}</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${strategy.market === 'Indian' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : strategy.market === 'Forex' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {strategy.market}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${strategy.trend === 'Uptrend' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : strategy.trend === 'Downtrend' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {trendIcon} {strategy.trend}
                  </span>
                  {strategy.timeframes.map(tf => (
                    <span key={tf} className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{tf}</span>
                  ))}
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0">✕</button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Images */}
            {strategy.image_urls.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chart Screenshots ({strategy.image_urls.length})</p>
                <div className="grid grid-cols-2 gap-3">
                  {strategy.image_urls.map((url, i) => (
                    <div key={i} onClick={() => setLightbox({ open: true, idx: i })}
                      className="aspect-video rounded-xl overflow-hidden border border-slate-700/50 cursor-pointer hover:border-indigo-500/50 transition-all group relative">
                      <img src={url} alt={`Chart ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            {strategy.explanation && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategy Explanation</p>
                <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-4">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{strategy.explanation}</p>
                </div>
              </div>
            )}

            {/* Meta */}
            {strategy.created_at && (
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">
                Added {new Date(strategy.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800/50 p-4 flex gap-3">
            <button onClick={onEdit} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button onClick={onDelete} className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-sm font-bold transition-all border border-rose-500/20 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Strategy Card ────────────────────────────────────────────────────────────
const StrategyCard: React.FC<{ strategy: Strategy; onClick: () => void }> = ({ strategy, onClick }) => {
  const marketIcon = strategy.market === 'Indian' ? '🇮🇳' : strategy.market === 'Forex' ? '💱' : '₿';
  const trendIcon = strategy.trend === 'Uptrend' ? '📈' : strategy.trend === 'Downtrend' ? '📉' : '↔';
  return (
    <div onClick={onClick} className="bg-slate-900/40 border border-slate-700/30 rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-300 group backdrop-blur-xl">
      {/* Thumbnail */}
      <div className="aspect-video bg-slate-800/50 relative overflow-hidden">
        {strategy.image_urls.length > 0 ? (
          <img src={strategy.image_urls[0]} alt={strategy.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">No Chart</span>
          </div>
        )}
        {strategy.image_urls.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[9px] text-white font-bold">+{strategy.image_urls.length - 1}</div>
        )}
      </div>
      {/* Info */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-black text-white text-sm leading-tight group-hover:text-indigo-300 transition-colors">{strategy.name}</h3>
          <span className="text-base shrink-0">{marketIcon}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${strategy.market === 'Indian' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : strategy.market === 'Forex' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            {strategy.market}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${strategy.trend === 'Uptrend' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : strategy.trend === 'Downtrend' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            {trendIcon} {strategy.trend}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {strategy.timeframes.slice(0, 4).map(tf => (
            <span key={tf} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-black">{tf}</span>
          ))}
          {strategy.timeframes.length > 4 && (
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded text-[8px] font-black">+{strategy.timeframes.length - 4}</span>
          )}
        </div>
        {strategy.explanation && (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{strategy.explanation}</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const StrategiesPage: React.FC = () => {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Strategy | undefined>(undefined);
  const [viewTarget, setViewTarget] = useState<Strategy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Strategy | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterMarket, setFilterMarket] = useState<string>('All');
  const [filterTrend, setFilterTrend] = useState<string>('All');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('All');

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStrategies = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data) {
      setStrategies(data.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        name: s.name,
        market: s.market as StrategyMarket,
        trend: s.trend as StrategyTrend,
        timeframes: s.timeframes as StrategyTimeframe[],
        explanation: s.explanation || '',
        image_urls: s.image_urls || [],
        created_at: s.created_at,
        updated_at: s.updated_at,
      })));
    }
  }, [user]);

  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  // ── Upload images to Supabase Storage ─────────────────────────────────────
  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!user || files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('strategy-images').upload(path, file, { upsert: false });
      if (upErr) { console.error('Upload error:', upErr); continue; }
      const { data: urlData } = supabase.storage.from('strategy-images').getPublicUrl(path);
      if (urlData?.publicUrl) urls.push(urlData.publicUrl);
    }
    return urls;
  };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async (data: Omit<Strategy, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { imageFiles?: File[] }) => {
    if (!user) return;
    setSaving(true);
    try {
      const uploadedUrls = await uploadImages(data.imageFiles || []);
      const allImageUrls = [...data.image_urls, ...uploadedUrls];

      if (editTarget) {
        const { error: err } = await supabase.from('strategies').update({
          name: data.name, market: data.market, trend: data.trend,
          timeframes: data.timeframes, explanation: data.explanation,
          image_urls: allImageUrls,
        }).eq('id', editTarget.id);
        if (err) throw err;
        showToast('Strategy updated successfully!', 'success');
      } else {
        const { error: err } = await supabase.from('strategies').insert({
          user_id: user.id, name: data.name, market: data.market, trend: data.trend,
          timeframes: data.timeframes, explanation: data.explanation,
          image_urls: allImageUrls,
        });
        if (err) throw err;
        showToast('Strategy added successfully!', 'success');
      }
      setShowForm(false);
      setEditTarget(undefined);
      await fetchStrategies();
    } catch (err: any) {
      showToast(err.message || 'Failed to save strategy', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error: err } = await supabase.from('strategies').delete().eq('id', deleteTarget.id);
    if (err) { showToast('Failed to delete strategy', 'error'); return; }
    showToast('Strategy deleted', 'success');
    setDeleteTarget(null);
    setViewTarget(null);
    await fetchStrategies();
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = strategies.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.market.toLowerCase().includes(q) || s.trend.toLowerCase().includes(q) || s.explanation.toLowerCase().includes(q);
    const matchMarket = filterMarket === 'All' || s.market === filterMarket;
    const matchTrend = filterTrend === 'All' || s.trend === filterTrend;
    const matchTf = filterTimeframe === 'All' || s.timeframes.includes(filterTimeframe as StrategyTimeframe);
    return matchSearch && matchMarket && matchTrend && matchTf;
  });

  const hasActiveFilters = filterMarket !== 'All' || filterTrend !== 'All' || filterTimeframe !== 'All' || !!search;
  const clearFilters = () => { setSearch(''); setFilterMarket('All'); setFilterTrend('All'); setFilterTimeframe('All'); };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modals */}
      {deleteTarget && <DeleteConfirmModal strategyName={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
      {viewTarget && !showForm && (
        <StrategyDetailModal
          strategy={viewTarget}
          onEdit={() => { setEditTarget(viewTarget); setViewTarget(null); setShowForm(true); }}
          onDelete={() => { setDeleteTarget(viewTarget); setViewTarget(null); }}
          onClose={() => setViewTarget(null)}
        />
      )}
      {showForm && (
        <StrategyFormModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(undefined); }}
          saving={saving}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/30 backdrop-blur-xl">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight">Strategies</h2>
          <p className="text-slate-500 text-[10px] lg:text-xs mt-1 font-medium tracking-wide">
            {strategies.length} {strategies.length === 1 ? 'strategy' : 'strategies'} documented
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-indigo-600/20 active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Strategy
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-4 backdrop-blur-xl space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search strategies..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Market filter */}
          <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)}
            className="bg-slate-800 border border-slate-700/50 text-slate-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
            <option value="All">All Markets</option>
            {(['Indian', 'Forex', 'Crypto'] as StrategyMarket[]).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Trend filter */}
          <select value={filterTrend} onChange={e => setFilterTrend(e.target.value)}
            className="bg-slate-800 border border-slate-700/50 text-slate-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
            <option value="All">All Trends</option>
            {(['Uptrend', 'Downtrend', 'Sideways'] as StrategyTrend[]).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {/* Timeframe filter */}
          <select value={filterTimeframe} onChange={e => setFilterTimeframe(e.target.value)}
            className="bg-slate-800 border border-slate-700/50 text-slate-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
            <option value="All">All Timeframes</option>
            {STRATEGY_TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading strategies...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-slate-900/40 border border-rose-500/20 rounded-2xl">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-rose-400 text-sm font-bold">Failed to load strategies</p>
          <p className="text-slate-600 text-xs">{error}</p>
          <button onClick={fetchStrategies} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-slate-900/40 border border-slate-700/30 rounded-2xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          {hasActiveFilters ? (
            <>
              <p className="text-white font-black text-lg">No strategies match your filters</p>
              <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
              <button onClick={clearFilters} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all">Clear Filters</button>
            </>
          ) : (
            <>
              <p className="text-white font-black text-lg">No strategies yet</p>
              <p className="text-slate-500 text-sm">Start documenting your trading setups</p>
              <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add First Strategy
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <StrategyCard key={s.id} strategy={s} onClick={() => setViewTarget(s)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StrategiesPage;
