'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Portfolio, Trade, Holding, TradeRequest } from '@/types';
import { api } from '@/lib/api';

interface PortfolioState {
  portfolio: Portfolio | null;
  trades: Trade[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  setPortfolio: (portfolio: Portfolio) => void;
  addTrade: (trade: Trade) => void;
  updateHolding: (symbol: string, amount: number, price: number) => void;
  refreshPortfolio: () => Promise<void>;
  fetchTrades: () => Promise<void>;
  executeTrade: (
    symbol: string,
    type: 'BUY' | 'SELL',
    amount: number,
    price: number
  ) => Promise<Trade>;
  reset: () => void;
  initialize: () => Promise<void>;
}

const initialState = {
  portfolio: null as Portfolio | null,
  trades: [] as Trade[],
  isLoading: false,
  error: null as string | null,
  isInitialized: false,
};

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPortfolio: (portfolio) => set({ portfolio }),

      addTrade: (trade) =>
        set((state) => ({
          trades: [trade, ...state.trades],
        })),

      updateHolding: (symbol, amount, price) =>
        set((state) => {
          if (!state.portfolio) return state;

          const existingIndex = state.portfolio.holdings.findIndex(
            (h) => h.symbol === symbol
          );
          let newHoldings: Holding[];

          if (existingIndex >= 0) {
            // Update existing holding
            newHoldings = state.portfolio.holdings.map((h, i) => {
              if (i !== existingIndex) return h;

              const newAmount = h.amount + amount;
              if (newAmount <= 0) {
                return null as unknown as Holding; // Will be filtered out
              }

              const newAvgBuyPrice =
                amount > 0
                  ? (h.avgBuyPrice * h.amount + price * amount) / newAmount
                  : h.avgBuyPrice;

              return {
                ...h,
                amount: newAmount,
                avgBuyPrice: newAvgBuyPrice,
                currentPrice: price,
                value: newAmount * price,
                pnl: (price - newAvgBuyPrice) * newAmount,
                pnlPercentage: ((price - newAvgBuyPrice) / newAvgBuyPrice) * 100,
              };
            }).filter(Boolean);
          } else if (amount > 0) {
            // Add new holding
            const newHolding: Holding = {
              symbol,
              name: symbol, // Will be updated with actual name
              mintAddress: '', // Will be updated with actual address
              amount,
              avgBuyPrice: price,
              currentPrice: price,
              value: amount * price,
              pnl: 0,
              pnlPercentage: 0,
            };
            newHoldings = [...state.portfolio.holdings, newHolding];
          } else {
            newHoldings = state.portfolio.holdings;
          }

          // Recalculate total value
          const holdingsValue = newHoldings.reduce((sum, h) => sum + h.value, 0);
          const totalValue = state.portfolio.cashBalance + holdingsValue;

          const totalPnl = newHoldings.reduce((sum, h) => sum + h.pnl, 0);
          const totalCost = newHoldings.reduce(
            (sum, h) => sum + h.avgBuyPrice * h.amount,
            0
          );

          return {
            portfolio: {
              ...state.portfolio,
              holdings: newHoldings,
              totalValue,
              pnl: totalPnl,
              pnlPercentage: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
            },
          };
        }),

      refreshPortfolio: async () => {
        set({ isLoading: true, error: null });
        try {
          const portfolio = await api.getPortfolio();
          set({ portfolio, isLoading: false });
        } catch (error) {
          console.error('Failed to refresh portfolio:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to refresh portfolio',
          });
        }
      },

      fetchTrades: async () => {
        try {
          const trades = await api.getTrades();
          set({ trades });
        } catch (error) {
          console.error('Failed to fetch trades:', error);
        }
      },

      initialize: async () => {
        const state = get();
        if (state.isInitialized) return;
        
        set({ isLoading: true });
        try {
          const [portfolio, trades] = await Promise.all([
            api.getPortfolio(),
            api.getTrades(),
          ]);
          set({ portfolio, trades, isLoading: false, isInitialized: true });
        } catch (error) {
          console.error('Failed to initialize portfolio:', error);
          set({
            isLoading: false,
            isInitialized: true,
            error: error instanceof Error ? error.message : 'Failed to initialize',
          });
        }
      },

      executeTrade: async (symbol, type, amount, price) => {
        const state = get();
        if (!state.portfolio) {
          throw new Error('Portfolio not initialized');
        }

        const totalCost = amount * price;

        // Validate trade
        if (type === 'BUY' && totalCost > state.portfolio.cashBalance) {
          throw new Error('Insufficient funds');
        }

        if (type === 'SELL') {
          const holding = state.portfolio.holdings.find((h) => h.symbol === symbol);
          if (!holding || holding.amount < amount) {
            throw new Error('Insufficient holdings');
          }
        }

        try {
          // Execute trade via API
          const tradeRequest: TradeRequest = {
            symbol,
            type,
            amount: type === 'BUY' ? totalCost : amount,
            slippageBps: 50,
          };

          const result = await api.executeTrade(tradeRequest);

          if (result.status === 'FAILED') {
            throw new Error(result.error || 'Trade failed');
          }

          const trade: Trade = {
            ...result,
            pnl: 0,
            pnlPercentage: 0,
          };

          // Add trade to local state
          set((state) => ({
            trades: [trade, ...state.trades],
          }));

          // Refresh portfolio from API to get updated values
          await get().refreshPortfolio();

          return trade;
        } catch (error) {
          console.error('Trade execution failed:', error);
          throw error;
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'portfolio-storage',
      // Don't persist anything - always fetch fresh from API
      partialize: () => ({}),
    }
  )
);
