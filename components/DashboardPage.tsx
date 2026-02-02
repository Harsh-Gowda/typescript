import React from 'react';
import Dashboard from './Dashboard';
import TradeList from './TradeList';
import Analytics from './Analytics';
import Calendar from './Calendar';
import { Trade, Currency, Emotion } from '../types';

interface DashboardPageProps {
    trades: Trade[];
    displayCurrency: Currency;
    onCloseTrade: (id: string, exitPrice: number, exitEmotion: Emotion, manualPnL?: number, exitNotes?: string, exitChartUrl?: string) => Promise<void>;
    onDeleteTrade: (id: string) => Promise<void>;
    onUpdateTrade: (updatedTrade: Trade) => Promise<void>;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    trades,
    displayCurrency,
    onCloseTrade,
    onDeleteTrade,
    onUpdateTrade
}) => {
    return (
        <div className="w-full space-y-8 lg:space-y-12 animate-in fade-in duration-500">
            <Dashboard trades={trades} displayCurrency={displayCurrency} />
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
                <div className="xl:col-span-8">
                    <TradeList
                        trades={trades}
                        displayCurrency={displayCurrency}
                        onCloseTrade={onCloseTrade}
                        onDeleteTrade={onDeleteTrade}
                        onUpdateTrade={onUpdateTrade}
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
    );
};

export default DashboardPage;
