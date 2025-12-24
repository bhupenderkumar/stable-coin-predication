'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AIRecommendation, AISettings, Token, AnalysisResponse, RiskLevel } from '@/types';
import { api, analyzeToken } from '@/lib/api';

interface AIRecommendationsState {
  // State
  recommendations: AIRecommendation[];
  settings: AISettings;
  isScanning: boolean;
  lastScanTime: number | null;
  scanProgress: number;
  scanError: string | null;
  tokensToScan: string[];
  currentScanIndex: number;

  // Actions
  startScan: (tokens: Token[]) => Promise<void>;
  stopScan: () => void;
  addRecommendation: (recommendation: AIRecommendation) => void;
  approveRecommendation: (id: string, executeTrade: (symbol: string, type: 'BUY' | 'SELL', amount: number, price: number) => Promise<any>) => Promise<void>;
  rejectRecommendation: (id: string) => void;
  approveAllPending: (executeTrade: (symbol: string, type: 'BUY' | 'SELL', amount: number, price: number) => Promise<any>) => Promise<void>;
  rejectAllPending: () => void;
  updateSettings: (settings: Partial<AISettings>) => void;
  clearExpired: () => void;
  clearAll: () => void;
}

const DEFAULT_SETTINGS: AISettings = {
  autoScan: false,
  scanInterval: 300, // 5 minutes
  minConfidence: 50,
  maxRiskLevel: 'HIGH',
  defaultTradeAmount: 100,
};

const RECOMMENDATION_EXPIRY = 15 * 60 * 1000; // 15 minutes

export const useAIRecommendationsStore = create<AIRecommendationsState>()(
  persist(
    (set, get) => ({
      // Initial state
      recommendations: [],
      settings: DEFAULT_SETTINGS,
      isScanning: false,
      lastScanTime: null,
      scanProgress: 0,
      scanError: null,
      tokensToScan: [],
      currentScanIndex: 0,

      // Start scanning all tokens
      startScan: async (tokens: Token[]) => {
        const state = get();
        if (state.isScanning) return;

        set({
          isScanning: true,
          scanProgress: 0,
          scanError: null,
          tokensToScan: tokens.map(t => t.symbol),
          currentScanIndex: 0,
        });

        const { settings } = get();
        const validTokens = tokens.filter(t => t.liquidity > 10000 && t.volume24h > 5000);

        for (let i = 0; i < validTokens.length; i++) {
          // Check if scan was stopped
          if (!get().isScanning) break;

          const token = validTokens[i];
          set({ 
            currentScanIndex: i,
            scanProgress: ((i + 1) / validTokens.length) * 100 
          });

          try {
            // Call AI analysis
            const analysis = await analyzeToken(token.symbol);

            // Only create recommendation if it meets criteria
            if (analysis.confidence >= settings.minConfidence && analysis.decision !== 'HOLD') {
              // Check risk level filter
              const riskOrder: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
              const analysisRiskIndex = riskOrder.indexOf(analysis.riskLevel);
              const maxRiskIndex = riskOrder.indexOf(settings.maxRiskLevel);

              if (analysisRiskIndex <= maxRiskIndex) {
                // Calculate suggested amount based on confidence
                const confidenceMultiplier = analysis.confidence / 100;
                const riskMultiplier = analysis.riskLevel === 'LOW' ? 1.5 : analysis.riskLevel === 'MEDIUM' ? 1 : 0.5;
                const suggestedAmount = settings.defaultTradeAmount * confidenceMultiplier * riskMultiplier;

                // Calculate potential profit/loss estimates
                const potentialProfit = analysis.decision === 'BUY' 
                  ? analysis.confidence * 0.1 // Rough estimate
                  : undefined;
                const potentialLoss = analysis.riskLevel === 'HIGH' ? 15 : analysis.riskLevel === 'MEDIUM' ? 10 : 5;

                const recommendation: AIRecommendation = {
                  id: uuidv4(),
                  symbol: token.symbol,
                  tokenName: token.name,
                  logoUrl: token.logoUrl,
                  decision: analysis.decision,
                  confidence: analysis.confidence,
                  reasoning: analysis.reasoning,
                  riskLevel: analysis.riskLevel,
                  indicators: analysis.indicators,
                  suggestedAmount: Math.round(suggestedAmount),
                  suggestedSlippage: 50, // 0.5%
                  currentPrice: token.price,
                  targetPrice: analysis.decision === 'BUY' ? token.price * 1.1 : token.price * 0.95,
                  stopLoss: analysis.decision === 'BUY' ? token.price * 0.95 : token.price * 1.05,
                  potentialProfit,
                  potentialLoss,
                  status: 'PENDING',
                  createdAt: Date.now(),
                  expiresAt: Date.now() + RECOMMENDATION_EXPIRY,
                };

                // Check for duplicate (same token with pending status)
                const existing = get().recommendations.find(
                  r => r.symbol === token.symbol && r.status === 'PENDING'
                );

                if (!existing) {
                  set(state => ({
                    recommendations: [recommendation, ...state.recommendations],
                  }));
                }
              }
            }

            // Add small delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Failed to analyze ${token.symbol}:`, error);
            // Continue to next token
          }
        }

        set({
          isScanning: false,
          lastScanTime: Date.now(),
          scanProgress: 100,
        });
      },

      // Stop scanning
      stopScan: () => {
        set({ isScanning: false });
      },

      // Add a single recommendation
      addRecommendation: (recommendation: AIRecommendation) => {
        set(state => ({
          recommendations: [recommendation, ...state.recommendations],
        }));
      },

      // Approve and execute a recommendation
      approveRecommendation: async (id: string, executeTrade) => {
        const state = get();
        const recommendation = state.recommendations.find(r => r.id === id);

        if (!recommendation || recommendation.status !== 'PENDING') return;

        // Update status to approved
        set(state => ({
          recommendations: state.recommendations.map(r =>
            r.id === id ? { ...r, status: 'APPROVED' as const } : r
          ),
        }));

        try {
          // Execute the trade
          const tradeType = recommendation.decision === 'SELL' ? 'SELL' : 'BUY';
          
          console.log('[AI Store] Approving recommendation:', {
            id,
            symbol: recommendation.symbol,
            decision: recommendation.decision,
            tradeType,
            suggestedAmount: recommendation.suggestedAmount,
            currentPrice: recommendation.currentPrice,
          });
          
          const result = await executeTrade(
            recommendation.symbol,
            tradeType,
            recommendation.suggestedAmount,
            recommendation.currentPrice
          );

          // Update to executed
          set(state => ({
            recommendations: state.recommendations.map(r =>
              r.id === id
                ? { 
                    ...r, 
                    status: 'EXECUTED' as const, 
                    executedAt: Date.now(),
                    tradeId: result.id 
                  }
                : r
            ),
          }));
        } catch (error) {
          console.error('Trade execution failed:', error);
          // Revert to pending
          set(state => ({
            recommendations: state.recommendations.map(r =>
              r.id === id ? { ...r, status: 'PENDING' as const } : r
            ),
          }));
          throw error;
        }
      },

      // Reject a recommendation
      rejectRecommendation: (id: string) => {
        set(state => ({
          recommendations: state.recommendations.map(r =>
            r.id === id ? { ...r, status: 'REJECTED' as const } : r
          ),
        }));
      },

      // Approve all pending recommendations
      approveAllPending: async (executeTrade) => {
        const state = get();
        const pendingRecs = state.recommendations.filter(r => r.status === 'PENDING');

        for (const rec of pendingRecs) {
          try {
            await get().approveRecommendation(rec.id, executeTrade);
          } catch (error) {
            console.error(`Failed to execute ${rec.symbol}:`, error);
          }
        }
      },

      // Reject all pending recommendations
      rejectAllPending: () => {
        set(state => ({
          recommendations: state.recommendations.map(r =>
            r.status === 'PENDING' ? { ...r, status: 'REJECTED' as const } : r
          ),
        }));
      },

      // Update settings
      updateSettings: (newSettings: Partial<AISettings>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // Clear expired recommendations
      clearExpired: () => {
        const now = Date.now();
        set(state => ({
          recommendations: state.recommendations.map(r =>
            r.status === 'PENDING' && r.expiresAt < now
              ? { ...r, status: 'EXPIRED' as const }
              : r
          ),
        }));
      },

      // Clear all recommendations
      clearAll: () => {
        set({ recommendations: [] });
      },
    }),
    {
      name: 'ai-recommendations-storage',
      partialize: (state) => ({
        recommendations: state.recommendations,
        settings: state.settings,
        lastScanTime: state.lastScanTime,
      }),
    }
  )
);

// Hook for auto-clearing expired recommendations
export function useAutoExpire() {
  const clearExpired = useAIRecommendationsStore(state => state.clearExpired);

  // Run every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      clearExpired();
    }, 60000);

    return () => clearInterval(interval);
  }, [clearExpired]);
}

// Import React for useEffect
import React from 'react';
