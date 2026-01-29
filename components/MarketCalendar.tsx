import React, { useEffect } from 'react';

const MarketCalendar: React.FC = () => {
    useEffect(() => {
        // Load Investing.com widget script
        const script = document.createElement('script');
        script.src = "https://www.investing.com/public/scripts/economicCalendarApi.php";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="space-y-4 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex justify-between items-center bg-slate-900/40 p-3 lg:p-6 rounded-xl lg:rounded-3xl border border-slate-700/30 backdrop-blur-xl">
                <div>
                    <h2 className="text-lg lg:text-2xl font-black text-white tracking-tight uppercase">Economic Calendar</h2>
                    <p className="text-slate-500 text-[9px] lg:text-xs mt-1 font-medium tracking-widest uppercase">Real-time forex and economic news</p>
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl lg:rounded-3xl border border-slate-700/30 overflow-hidden relative">
                <div className="w-full overflow-x-auto overflow-y-auto p-2 lg:p-6" style={{ maxHeight: '70vh' }}>
                    <iframe
                        src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=25,32,6,37,72,22,17,39,14,10,35,43,56,36,110,11,26,12,4,5&calType=day&timeZone=23&lang=1"
                        width="100%"
                        height="600"
                        frameBorder="0"
                        allowTransparency={true}
                        marginWidth={0}
                        marginHeight={0}
                        className="min-w-[600px] lg:min-w-full"
                        style={{ minHeight: '500px' }}
                    />
                </div>
                <div className="text-[9px] lg:text-[10px] text-slate-600 p-2 text-center bg-slate-900/60">
                    Powered by{' '}
                    <a
                        href="https://www.investing.com/"
                        rel="nofollow"
                        target="_blank"
                        className="text-indigo-400 hover:text-indigo-300"
                    >
                        Investing.com
                    </a>
                </div>
            </div>
        </div>
    );
};

export default MarketCalendar;
