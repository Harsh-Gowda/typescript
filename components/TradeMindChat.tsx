import React, { useState, useRef, useEffect } from 'react';
import { Trade, Currency } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Props {
    trades: Trade[];
    displayCurrency: Currency;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const TRADEMIND_SYSTEM_PROMPT = `You are TradeMind, an elite trading psychology coach. Your role is to identify destructive patterns, explain the psychology behind mistakes, and prescribe ONE specific mental fix.

## OUTPUT CONSTRAINTS
- Limit response to 2-3 lines total.
- NO bullet points, NO numbered lists, NO bold text.
- Flow like a conversation with a wise mentor.
- Reference specific trades from the data provided (e.g., "Monday's AAPL trade") to prove analysis.
- Provide ONE actionable mental exercise or rule for the next session.
- Maintain a direct but compassionate tone.

## FORBIDDEN
- Generic advice.
- Financial predictions or trade recommendations.
- Hindsight "You should have" statements.
- Bold text or list formatting of any kind.`;
const FEEDBACK_SYSTEM_PROMPT = `You are TradeMind's Quick-Report Assistant. Your goal is to collect bug reports in 4 clicks + 1 line. No small talk.

## STEP-BY-STEP FLOW
1. **Location**: "Where is the error? [Journal Entry] [Dashboard] [AI Chat] [Charts] [Login] [Other]"
2. **Urgency**: "How urgent? [🟢 Low] [🟡 Medium] [🔴 High]"
3. **Major Issues**: "Pick the issue: [Page Not Loading] [Data Not Saving] [Button Not Working] [Wrong Calculation] [Slow/Laggy] [Text Cut Off] [Can't Login] [AI Wrong Response] [Other - I'll type]"
4. **Description**: If they picked "Other", ask for one line. Otherwise, make it optional.
5. **Close**: "✅ Reported! Harsh will fix this within 24hrs. Thanks for helping TradeMind improve 🚀"

## DATA CAPTURE
Once urgency and issue are known, provide JSON:
\`\`\`json
{
  "page": "...",
  "urgency": "low/medium/high",
  "issue_type": "...",
  "description": "..."
}
\`\`\`

## RULES
- NEVER ask for email.
- Keep buttons big and easy to tap.
- Target: Under 15 seconds.

## POWER USER SHORTCUT
If user types "bug [location] [issue]" (e.g., "bug dashboard not loading"), capture all data immediately and reply: "✅ Got it! Reported."`;

const TradeMindChat: React.FC<Props> = ({ trades, displayCurrency }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'coach' | 'feedback'>('coach');
    const [showTooltip, setShowTooltip] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [feedbackMessages, setFeedbackMessages] = useState<Message[]>([
        {
            id: 'initial-feedback',
            role: 'assistant',
            content: 'Where is the error? [Journal Entry] [Dashboard] [AI Chat] [Charts] [Login] [Other]',
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [isSavingRating, setIsSavingRating] = useState(false);
    const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const currentMessages = activeTab === 'coach' ? messages : feedbackMessages;
    const setMessagesProxy = activeTab === 'coach' ? setMessages : setFeedbackMessages;

    const handleRating = async (value: number) => {
        if (!user || isSavingRating) return;

        setIsSavingRating(true);
        try {
            const { error } = await supabase
                .from('chat_ratings')
                .insert({
                    user_id: user.id,
                    rating: value,
                    message_count: messages.length,
                    timestamp: new Date().toISOString()
                });

            if (error) throw error;
            setRating(value);
        } catch (error) {
            console.error('Error saving rating:', error);
            // Still show the local UI change so user isn't blocked
            setRating(value);
        } finally {
            setIsSavingRating(false);
        }
    };

    const saveFeedbackToDB = async (jsonString: string) => {
        if (!user) return;
        try {
            const cleanJson = jsonString.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            await supabase.from('user_feedback').insert({
                user_id: user.id,
                category: data.issue_type || data.category || 'BUG',
                description: data.description || `Bug in ${data.page}`,
                urgency: data.urgency || 'medium',
                contact_email: null,
                page_url: data.page ? `internal://${data.page}` : window.location.href,
                user_agent: navigator.userAgent
            });
        } catch (e) {
            console.error('Feedback extraction error:', e);
        }
    };

    // Track when to show feedback prompt (after first AI response)
    useEffect(() => {
        if (!rating && messages.some(m => m.role === 'assistant')) {
            const timer = setTimeout(() => setShowFeedbackPrompt(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [messages, rating]);

    useEffect(() => {
        // Show tooltip after 2 seconds to highlight chat existence
        const timer = setTimeout(() => {
            if (!isOpen) setShowTooltip(true);
        }, 2000);

        // Hide tooltip after 8 seconds
        const hideTimer = setTimeout(() => {
            setShowTooltip(false);
        }, 8000);

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const getTradeContext = () => {
        if (trades.length === 0) return "No trades logged yet.";

        const recentTrades = trades.slice(0, 10);
        const summary = recentTrades.map(t => ({
            symbol: t.symbol,
            type: t.type,
            status: t.status,
            pnl: t.pnl || 0,
            currency: t.currency,
            entryEmotion: t.entryEmotion,
            exitEmotion: t.exitEmotion,
            notes: t.notes?.substring(0, 100)
        }));

        const totalPnL = trades.filter(t => t.pnl).reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winRate = trades.filter(t => t.pnl && t.pnl > 0).length / trades.filter(t => t.pnl !== undefined).length * 100 || 0;

        return `
Trading Context (${displayCurrency}):
- Total Trades: ${trades.length}
- Win Rate: ${winRate.toFixed(1)}%
- Total P&L: ${totalPnL.toFixed(2)}

Recent 10 Trades:
${JSON.stringify(summary, null, 2)}`;
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: Date.now()
        };

        setMessagesProxy(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;

            if (!apiKey) {
                throw new Error("Groq API Key not found. Please add VITE_GROQ_API_KEY to your .env file.");
            }

            const prompt = activeTab === 'coach'
                ? TRADEMIND_SYSTEM_PROMPT + '\n\n## CURRENT TRADING DATA\n' + getTradeContext()
                : FEEDBACK_SYSTEM_PROMPT;

            const chatMessages = [
                { role: 'system', content: prompt },
                ...currentMessages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: input.trim() }
            ];

            if (activeTab === 'feedback') {
                const lowerInput = input.trim().toLowerCase();
                if (lowerInput.startsWith('bug ') || lowerInput === 'bug' || lowerInput === 'broken') {
                    const emergencyMsg: Message = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: '✅ Got it! Reported.',
                        timestamp: Date.now()
                    };
                    setMessagesProxy(prev => [...prev, emergencyMsg]);

                    // Trigger background save for power user shortcut
                    saveFeedbackToDB(JSON.stringify({
                        page: 'shortcut-capture',
                        urgency: 'high',
                        issue_type: 'power-user-report',
                        description: input.trim()
                    }));

                    setIsLoading(false);
                    setInput('');
                    return;
                }
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: chatMessages,
                    temperature: 0.7,
                    max_tokens: 1024,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const assistantContent = data.choices?.[0]?.message?.content || "I'm having trouble responding right now.";

            // If in feedback mode and has JSON, save it
            if (activeTab === 'feedback' && assistantContent.includes('```json')) {
                const jsonMatch = assistantContent.match(/```json([\s\S]*?)```/);
                if (jsonMatch) await saveFeedbackToDB(jsonMatch[0]);
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: assistantContent,
                timestamp: Date.now()
            };

            setMessagesProxy(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('TradeMind AI Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I encountered an issue: ${error.message}. Please check your API configuration.`,
                timestamp: Date.now()
            };
            setMessagesProxy(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Chat Window */}
            <div
                className={`fixed bottom-24 lg:bottom-6 right-4 lg:right-6 w-[calc(100vw-2rem)] sm:w-96 bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-700/50 shadow-2xl shadow-indigo-500/10 z-50 transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
                    }`}
                style={{ maxHeight: 'calc(100vh - 160px)' }}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white tracking-tight">TradeMind</h3>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {activeTab === 'coach' ? 'Psychology Coach' : 'Feedback Assistant'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setActiveTab('coach')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'coach'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Psychology
                        </button>
                        <button
                            onClick={() => setActiveTab('feedback')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'feedback'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Feedback
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="h-80 overflow-y-auto p-4 space-y-4 custom-scrollbar relative">
                    {currentMessages.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h4 className="text-white font-bold text-sm mb-2">
                                {activeTab === 'coach' ? 'Welcome to TradeMind' : 'Quick Feedback'}
                            </h4>
                            {activeTab === 'coach' && (
                                <p className="text-slate-500 text-xs leading-relaxed max-w-[250px] mx-auto">
                                    I'm your trading psychology coach. Share your trades, emotions, or concerns.
                                </p>
                            )}
                            <div className="mt-4 space-y-2">
                                {activeTab === 'coach' ? (
                                    [
                                        "Analyze my recent trades",
                                        "I'm feeling anxious about today",
                                        "Help me prepare mentally"
                                    ].map((suggestion, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(suggestion)}
                                            className="block w-full text-left px-3 py-2 text-xs text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))
                                ) : (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {["Journal Entry", "Dashboard", "AI Chat", "Charts", "Login", "Other"].map((suggestion, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setInput(suggestion);
                                                    setTimeout(() => sendMessage(), 10);
                                                }}
                                                className="px-4 py-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 transition-all hover:scale-105"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentMessages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${message.role === 'user'
                                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-md shadow-lg shadow-indigo-600/10'
                                    : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md shadow-sm'
                                    }`}
                            >
                                <div className="whitespace-pre-wrap">
                                    {/* Hide JSON and extract text */}
                                    {(() => {
                                        let content = message.content.split('```json')[0].trim();
                                        // Detect [Button] patterns and strip them from main text for clean look
                                        // if message is from assistant
                                        if (message.role === 'assistant') {
                                            content = content.replace(/\[(.*?)\]/g, '').trim();
                                        }
                                        return content;
                                    })()}
                                </div>
                            </div>

                            {/* Render AI suggestion buttons */}
                            {message.role === 'assistant' && (
                                <div className="flex flex-wrap gap-2 mt-2 max-w-[90%]">
                                    {(message.content.match(/\[(.*?)\]/g) || []).map((btn, i) => {
                                        const label = btn.slice(1, -1);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setInput(label);
                                                    setTimeout(() => sendMessage(), 10);
                                                }}
                                                className="px-3 py-1.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-bl-md">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Feedback Prompt (Only in Coach mode) */}
                    {activeTab === 'coach' && showFeedbackPrompt && !rating && (
                        <div className="flex justify-center my-4 animate-in fade-in zoom-in duration-500">
                            <div className="bg-slate-800/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate this session</p>
                                <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onClick={() => handleRating(star)}
                                            disabled={isSavingRating}
                                            className={`p-1 transition-all hover:scale-125 active:scale-90 ${isSavingRating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <svg
                                                className={`w-7 h-7 transition-colors duration-200 ${(hoverRating || 0) >= star
                                                    ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                                                    : 'text-slate-600 fill-none'
                                                    }`}
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {rating && (
                        <div className="flex justify-center my-4 animate-in fade-in zoom-in duration-500">
                            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl px-6 py-3 flex items-center gap-3">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <svg
                                            key={s}
                                            className={`w-3 h-3 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`}
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-indigo-300">Thanks for the {rating}-star rating!</p>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Share your thoughts..."
                            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className={`p-3 rounded-xl transition-all ${input.trim() && !isLoading
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Button & Tooltip */}
            <div className={`fixed bottom-24 lg:bottom-6 right-4 lg:right-6 flex flex-col items-end z-50 transition-all duration-300 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
                {/* Highlight Tooltip */}
                <div
                    className={`mb-4 px-4 py-3 bg-indigo-600 text-white text-xs font-bold rounded-2xl rounded-br-none shadow-2xl transition-all duration-500 transform ${showTooltip ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'}`}
                    style={{ filter: 'drop-shadow(0 10px 15px rgba(79, 70, 229, 0.4))' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span>Need a strategy review? Ask TradeMind.</span>
                    </div>
                </div>

                <button
                    onClick={() => { setIsOpen(true); setShowTooltip(false); }}
                    className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-indigo-600/40 active:scale-95 group relative"
                >
                    <div className="absolute inset-0 bg-indigo-500 rounded-2xl animate-ping opacity-20 group-hover:opacity-40"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl animate-pulse opacity-50"></div>
                    <svg className="w-7 h-7 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>

                    {/* Activity Indicator Badge */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-4 border-slate-900 flex items-center justify-center text-[10px] font-black group-hover:scale-125 transition-transform">
                        1
                    </div>
                </button>
            </div>
        </>
    );
};

export default TradeMindChat;
