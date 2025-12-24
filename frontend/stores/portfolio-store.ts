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
  executeTradeRequest: (request: TradeRequest) => Promise<Trade>;
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
          
          // Calculate total PnL based on initial capital ($10,000)
          // This matches backend logic
          const initialCapital = 10000;
          const totalPnl = totalValue - initialCapital;
          const pnlPercentage = ((totalValue - initialCapital) / initialCapital) * 100;

          return {
            portfolio: {
              ...state.portfolio,
              holdings: newHoldings,
              totalValue,
              pnl: totalPnl,
              pnlPercentage,
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

        // Backend API expects:
        // - BUY: amount in USD
        // - SELL: amount in TOKENS
        // This function receives amount parameter in USD for both BUY and SELL
        // (from AI recommendations which use suggestedAmount in USD)
        
        let apiAmount: number;  // Amount to send to API
        let costInUSD: number;  // Cost/value in USD for validation
        
        if (type === 'BUY') {
          // For BUY: API expects USD, we have USD
          apiAmount = amount;
          costInUSD = amount;
        } else {
          // For SELL: API expects TOKENS, we have USD value
          // Convert USD to tokens
          if (price <= 0) {
            throw new Error('Invalid price for sell calculation');
          }
          apiAmount = amount / price;  // Convert USD to tokens
          costInUSD = amount;
        }

        // Validate trade
        if (type === 'BUY' && costInUSD > state.portfolio.cashBalance) {
          throw new Error('Insufficient funds');
        }

        if (type === 'SELL') {
          const holding = state.portfolio.holdings.find((h) => h.symbol === symbol);
          if (!holding || holding.amount < apiAmount) {
            throw new Error(`Insufficient holdings. Need ${apiAmount.toFixed(6)} ${symbol}, have ${holding?.amount.toFixed(6) || 0}`);
          }
        }

        try {
          // Execute trade via API
          const tradeRequest: TradeRequest = {
            symbol,
            type,
            amount: apiAmount,
            slippageBps: 50,
          };

          console.log('[Portfolio Store] Executing trade:', {
            symbol,
            type,
            originalAmount: amount,
            price,
            apiAmount,
            costInUSD,
            tradeRequest,
          });

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

      executeTradeRequest: async (request: TradeRequest) => {
        try {
          console.log('[Portfolio Store] Executing trade request:', request);
          const result = await api.executeTrade(request);

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
          console.error('Trade request execution failed:', error);
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
