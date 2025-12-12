'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Portfolio, Trade, Holding } from '@/types';
import { mockPortfolio, mockTrades } from '@/lib/mock-data';

interface PortfolioState {
  portfolio: Portfolio | null;
  trades: Trade[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setPortfolio: (portfolio: Portfolio) => void;
  addTrade: (trade: Trade) => void;
  updateHolding: (symbol: string, amount: number, price: number) => void;
  refreshPortfolio: () => Promise<void>;
  executeTrade: (
    symbol: string,
    type: 'BUY' | 'SELL',
    amount: number,
    price: number
  ) => Promise<Trade>;
  reset: () => void;
}

const initialState = {
  portfolio: mockPortfolio,
  trades: mockTrades,
  isLoading: false,
  error: null,
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
          // In real implementation, this would fetch from API
          // For now, we just simulate a delay
          await new Promise((resolve) => setTimeout(resolve, 500));
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to refresh portfolio',
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

        // Create trade record
        const trade: Trade = {
          id: `trade_${Date.now()}`,
          symbol,
          type,
          amountIn: type === 'BUY' ? totalCost : amount,
          amountOut: type === 'BUY' ? amount : totalCost,
          price,
          fee: totalCost * 0.003, // 0.3% fee
          timestamp: Date.now(),
          status: 'EXECUTED',
          txHash: `mock_tx_${Math.random().toString(36).substring(7)}`,
        };

        // Update portfolio
        set((state) => {
          if (!state.portfolio) return state;

          const cashChange = type === 'BUY' ? -totalCost : totalCost;
          const holdingChange = type === 'BUY' ? amount : -amount;

          return {
            trades: [trade, ...state.trades],
            portfolio: {
              ...state.portfolio,
              cashBalance: state.portfolio.cashBalance + cashChange,
            },
          };
        });

        // Update holding
        const holdingChange = type === 'BUY' ? amount : -amount;
        get().updateHolding(symbol, holdingChange, price);

        return trade;
      },

      reset: () => set(initialState),
    }),
    {
      name: 'portfolio-storage',
      partialize: (state) => ({
        portfolio: state.portfolio,
        trades: state.trades,
      }),
    }
  )
);
