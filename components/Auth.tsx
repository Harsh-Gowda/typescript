import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>

            <div className="max-w-md w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative space-y-8 bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl border border-slate-700/50 shadow-2xl">
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-lg scale-110"></div>
                                <div className="relative p-4 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl">
                                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight mb-3">
                            TradeMind
                        </h1>
                        <h2 className="text-lg text-slate-300 font-bold uppercase tracking-[0.2em]">
                            {isSignUp ? 'New Era' : 'Back to Edge'}
                        </h2>
                        <p className="mt-4 text-sm text-slate-500 font-medium">
                            {isSignUp ? 'Precision tracking for serious traders.' : 'Your psychology is your edge. Welcome back.'}
                        </p>
                    </div>

                    <form className="mt-8 space-y-5" onSubmit={handleAuth}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                                    Strategic Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                    placeholder="you@edge.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                                    Access Key
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1 h-1 rounded-full ${message.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                    {message.text}
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black text-white hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 premium-glow"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <>
                                        <span>{isSignUp ? 'Initialize Account' : 'Authenticate Access'}</span>
                                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="text-center pt-2">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setMessage(null);
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-indigo-400 transition-all uppercase tracking-widest"
                        >
                            {isSignUp ? 'Existing user? Secure Sign In' : "New operative? Create Profile"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
