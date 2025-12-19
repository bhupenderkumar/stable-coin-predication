// ============================================
// API Client with Mock/Real Toggle
// ============================================

import { getFeatureFlags } from './feature-flags';
import {
  mockTokens,
  mockAnalysis,
  mockOHLCV,
  mockPortfolio,
  mockTrades,
  getRandomPriceUpdate,
} from './mock-data';
import type {
  Token,
  AnalysisResponse,
  OHLCV,
  TradeResponse,
  TradeRequest,
  Portfolio,
  Trade,
  TimeInterval,
} from '@/types';

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 10000; // 10 seconds

// ============================================
// API Client Class
// ============================================

class APIClient {
  private flags = getFeatureFlags();

  // ----------------------------------------
  // Token Endpoints
  // ----------------------------------------

  async getTokens(): Promise<Token[]> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(300);
      // Add some random price fluctuation for realism
      return mockTokens.map((token) => getRandomPriceUpdate(token));
    }

    const response = await this.fetch<{ tokens: Token[]; total: number }>('/api/tokens');
    return response.tokens;
  }

  async getToken(symbol: string): Promise<Token | null> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(200);
      const token = mockTokens.find((t) => t.symbol === symbol);
      return token ? getRandomPriceUpdate(token) : null;
    }

    try {
      const response = await this.fetch<Token>(`/api/tokens/${symbol}`);
      return response;
    } catch {
      return null;
    }
  }

  async getTokenOHLCV(
    symbol: string,
    interval: TimeInterval = '1h',
    limit: number = 168
  ): Promise<OHLCV[]> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(400);
      return mockOHLCV[symbol] || mockOHLCV['default'];
    }

    const response = await this.fetch<{ symbol: string; interval: string; data: OHLCV[] }>(
      `/api/tokens/${symbol}/ohlcv?interval=${interval}&limit=${limit}`
    );
    return response.data;
  }

  // ----------------------------------------
  // AI Analysis Endpoints
  // ----------------------------------------

  async analyzeToken(symbol: string): Promise<AnalysisResponse> {
    if (!this.flags.USE_REAL_API) {
      // Simulate AI thinking time
      await this.simulateDelay(1500 + Math.random() * 1000);
      
      const analysis = mockAnalysis[symbol] || mockAnalysis['default'];
      return {
        ...analysis,
        timestamp: Date.now(),
        // Add some randomness to confidence
        confidence: Math.min(100, Math.max(0, analysis.confidence + (Math.random() - 0.5) * 10)),
      };
    }

    const response = await this.fetch<AnalysisResponse>('/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    });
    return response;
  }

  // ----------------------------------------
  // Trade Endpoints
  // ----------------------------------------

  async executeTrade(request: TradeRequest): Promise<TradeResponse> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(800);
      return this.generateMockTrade(request);
    }

    const response = await this.fetch<TradeResponse>('/api/trades', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response;
  }

  async getTrades(): Promise<Trade[]> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(300);
      return mockTrades;
    }

    const response = await this.fetch<{ trades: Trade[]; total: number }>('/api/trades/history');
    return response.trades;
  }

  // ----------------------------------------
  // Portfolio Endpoints
  // ----------------------------------------

  async getPortfolio(): Promise<Portfolio> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(300);
      
      // Update portfolio values based on current prices
      const updatedHoldings = mockPortfolio.holdings.map((holding) => {
        const token = mockTokens.find((t) => t.symbol === holding.symbol);
        if (token) {
          const currentPrice = token.price;
          const value = holding.amount * currentPrice;
          const pnl = (currentPrice - holding.avgBuyPrice) * holding.amount;
          const pnlPercentage = ((currentPrice - holding.avgBuyPrice) / holding.avgBuyPrice) * 100;
          
          return {
            ...holding,
            currentPrice,
            value,
            pnl,
            pnlPercentage,
          };
        }
        return holding;
      });

      const holdingsValue = updatedHoldings.reduce((sum, h) => sum + h.value, 0);
      const totalPnl = updatedHoldings.reduce((sum, h) => sum + h.pnl, 0);

      return {
        ...mockPortfolio,
        holdings: updatedHoldings,
        totalValue: mockPortfolio.cashBalance + holdingsValue,
        pnl: totalPnl,
        pnlPercentage: (totalPnl / (mockPortfolio.cashBalance + holdingsValue - totalPnl)) * 100,
        lastUpdated: Date.now(),
      };
    }

    // Fetch from real API and map to frontend Portfolio type
    interface BackendPortfolio {
      totalValue: number;
      cash: number;
      holdingsValue: number;
      pnl: number;
      pnlPercentage: number;
      holdings: Array<{
        symbol: string;
        amount: number;
        avgPrice: number;
        currentPrice: number;
        value: number;
        pnl: number;
        pnlPercentage: number;
      }>;
    }

    const response = await this.fetch<BackendPortfolio>('/api/portfolio');
    
    // Map backend response to frontend Portfolio type
    const portfolio: Portfolio = {
      totalValue: response.totalValue,
      cashBalance: response.cash,
      pnl: response.pnl,
      pnlPercentage: response.pnlPercentage,
      holdings: response.holdings.map((h) => ({
        symbol: h.symbol,
        name: h.symbol, // Backend doesn't provide name, use symbol
        mintAddress: '', // Backend doesn't provide mint address
        amount: h.amount,
        value: h.value,
        avgBuyPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        pnl: h.pnl,
        pnlPercentage: h.pnlPercentage,
      })),
      lastUpdated: Date.now(),
    };

    return portfolio;
  }

  // ----------------------------------------
  // Health Check
  // ----------------------------------------

  async healthCheck(): Promise<{ status: string; mode: string }> {
    if (!this.flags.USE_REAL_API) {
      return { status: 'ok', mode: 'mock' };
    }

    try {
      const response = await this.fetch<{ status: string }>('/health');
      return { ...response, mode: 'real' };
    } catch {
      return { status: 'error', mode: 'real' };
    }
  }

  // ----------------------------------------
  // Helper Methods
  // ----------------------------------------

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private async simulateDelay(ms: number = 500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateMockTrade(request: TradeRequest): TradeResponse {
    const token = mockTokens.find((t) => t.symbol === request.symbol);
    const price = token?.price || 1;
    const slippageMultiplier = 1 + (request.slippageBps / 10000) * (Math.random() - 0.5);
    const effectivePrice = price * slippageMultiplier;

    const amountOut =
      request.type === 'BUY'
        ? request.amount / effectivePrice
        : request.amount * effectivePrice;

    const fee = request.amount * 0.003; // 0.3% fee

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      return {
        id: `trade_${Date.now()}`,
        status: 'FAILED',
        symbol: request.symbol,
        type: request.type,
        amountIn: request.amount,
        amountOut: 0,
        price: effectivePrice,
        fee: 0,
        timestamp: Date.now(),
        error: 'Transaction failed: Slippage tolerance exceeded',
      };
    }

    return {
      id: `trade_${Date.now()}`,
      status: 'EXECUTED',
      symbol: request.symbol,
      type: request.type,
      amountIn: request.amount,
      amountOut,
      price: effectivePrice,
      fee,
      timestamp: Date.now(),
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

export const api = new APIClient();

// ============================================
// Convenience Functions
// ============================================

export async function fetchTokens(): Promise<Token[]> {
  return api.getTokens();
}

export async function fetchToken(symbol: string): Promise<Token | null> {
  return api.getToken(symbol);
}

export async function fetchOHLCV(
  symbol: string,
  interval?: TimeInterval,
  limit?: number
): Promise<OHLCV[]> {
  return api.getTokenOHLCV(symbol, interval, limit);
}

export async function analyzeToken(symbol: string): Promise<AnalysisResponse> {
  return api.analyzeToken(symbol);
}

export async function executeTrade(request: TradeRequest): Promise<TradeResponse> {
  return api.executeTrade(request);
}

export async function fetchPortfolio(): Promise<Portfolio> {
  return api.getPortfolio();
}

export async function fetchTrades(): Promise<Trade[]> {
  return api.getTrades();
}
