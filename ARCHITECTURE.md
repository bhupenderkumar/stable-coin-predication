# Solana Meme Coin Trading Bot - Technical Architecture

## 🎯 Project Overview

An AI-powered meme coin trading bot on Solana that uses LLMs for market analysis and automated trading decisions. This project is designed for rapid prototyping and Solana grant demonstration.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Token Table │  │ Price Chart │  │ AI Analysis │  │ Trade Simulator     │ │
│  │ (Trending)  │  │ (OHLCV/RSI) │  │   Panel     │  │ (Paper/Live)        │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ REST API
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Data Service│  │ AI Service  │  │Trade Service│  │ Scheduler Service   │ │
│  │ (Fetchers)  │  │ (Groq/LLM)  │  │ (Jupiter)   │  │ (APScheduler)       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
            │   Binance   │   │   Jupiter   │   │   Birdeye   │
            │   API       │   │   API       │   │   API       │
            └─────────────┘   └─────────────┘   └─────────────┘
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌─────────────────────────────────────────────────┐
            │              SOLANA BLOCKCHAIN                   │
            │  (Devnet for testing → Mainnet for production)  │
            └─────────────────────────────────────────────────┘
```

---

## 🚀 Phased Implementation Plan

### Phase 1: Frontend with Mock Data (Week 1-2)
**Goal:** Build a fully interactive, demo-ready UI with simulated data

#### Deliverables:
1. **Token Dashboard**
   - Table of trending meme coins (mock data)
   - Sortable by volume, price change, liquidity
   - Search and filter functionality

2. **Price Charts**
   - OHLCV candlestick charts
   - Technical indicators (RSI, Volume trends)
   - Timeframe selector (1H, 4H, 1D, 1W)

3. **AI Analysis Panel**
   - "Analyze" button for each token
   - Display AI decision (BUY/NO_BUY)
   - Confidence score visualization
   - Risk level indicator

4. **Trade Simulator**
   - Paper trading interface
   - Portfolio tracker
   - Trade history log

#### Tech Stack:
- **Framework:** Next.js 14 (App Router)
- **UI Library:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts or Lightweight Charts
- **State Management:** Zustand
- **Mock Data:** JSON files / MSW (Mock Service Worker)

#### File Structure:
```
frontend/
├── app/
│   ├── page.tsx                 # Dashboard home
│   ├── layout.tsx               # Root layout
│   ├── tokens/
│   │   └── [symbol]/page.tsx    # Token detail page
│   └── portfolio/page.tsx       # Portfolio view
├── components/
│   ├── ui/                      # shadcn components
│   ├── TokenTable.tsx           # Trending tokens table
│   ├── PriceChart.tsx           # OHLCV chart
│   ├── AIAnalysisCard.tsx       # AI decision display
│   ├── TradeForm.tsx            # Trade execution form
│   ├── PortfolioSummary.tsx     # Holdings overview
│   └── RiskMeter.tsx            # Risk visualization
├── lib/
│   ├── mock-data.ts             # Mock token data
│   ├── api.ts                   # API client (mocked initially)
│   └── utils.ts                 # Helper functions
├── hooks/
│   ├── useTokens.ts             # Token data hook
│   ├── useAnalysis.ts           # AI analysis hook
│   └── useTrade.ts              # Trade execution hook
├── stores/
│   └── portfolio-store.ts       # Zustand store
├── types/
│   └── index.ts                 # TypeScript types
└── public/
    └── mock/
        ├── tokens.json          # Mock token list
        ├── ohlcv.json           # Mock price data
        └── analysis.json        # Mock AI responses
```

---

### Phase 2: Backend Integration (Week 3-4)
**Goal:** Connect frontend to real APIs and enable paper trading

#### Deliverables:
1. **Data Fetching Service**
   - Real-time token data from Birdeye/Jupiter
   - Historical OHLCV from Binance/CryptoDataDownload
   - Caching layer for rate limit management

2. **AI Analysis Service**
   - Groq API integration (Llama 3.1)
   - Structured JSON responses
   - Confidence scoring algorithm

3. **Trading Service**
   - Jupiter API integration
   - Paper trading mode (simulated execution)
   - Transaction logging

4. **Scheduler Service**
   - Automated market scanning
   - Alert system for opportunities

#### Tech Stack:
- **Framework:** FastAPI (Python)
- **Database:** SQLite → PostgreSQL
- **Cache:** Redis (optional)
- **Scheduler:** APScheduler
- **AI:** Groq API / Ollama
- **Blockchain:** Solana.py + Jupiter API

#### File Structure:
```
backend/
├── app/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Configuration
│   ├── database.py              # DB connection
│   ├── models/
│   │   ├── token.py             # Token model
│   │   ├── trade.py             # Trade model
│   │   └── analysis.py          # Analysis model
│   ├── routers/
│   │   ├── tokens.py            # Token endpoints
│   │   ├── analysis.py          # AI analysis endpoints
│   │   ├── trades.py            # Trade endpoints
│   │   └── portfolio.py         # Portfolio endpoints
│   ├── services/
│   │   ├── data_fetcher.py      # External API calls
│   │   ├── ai_analyzer.py       # LLM integration
│   │   ├── trader.py            # Trade execution
│   │   └── scheduler.py         # Background tasks
│   └── utils/
│       ├── indicators.py        # Technical indicators
│       └── validators.py        # Input validation
├── tests/
│   ├── test_tokens.py
│   ├── test_analysis.py
│   └── test_trades.py
├── requirements.txt
├── .env.example
└── Dockerfile
```

---

## 📡 API Specification

### Phase 1 Endpoints (Mocked)

```
GET  /api/tokens                 # List trending tokens
GET  /api/tokens/{symbol}        # Token details
GET  /api/tokens/{symbol}/ohlcv  # Historical price data
POST /api/analyze                # AI analysis request
POST /api/trade                  # Execute paper trade
GET  /api/portfolio              # User portfolio
GET  /api/trades                 # Trade history
```

### Request/Response Types

```typescript
// Token
interface Token {
  symbol: string;
  name: string;
  mintAddress: string;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders: number;
}

// OHLCV Data
interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// AI Analysis
interface AnalysisRequest {
  symbol: string;
  tokenData: Token;
  ohlcv: OHLCV[];
}

interface AnalysisResponse {
  decision: 'BUY' | 'NO_BUY' | 'SELL';
  confidence: number; // 0-100
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  indicators: {
    rsi: number;
    volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    priceAction: string;
  };
}

// Trade
interface TradeRequest {
  symbol: string;
  type: 'BUY' | 'SELL';
  amount: number; // USD value
  slippageBps: number;
}

interface TradeResponse {
  id: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  symbol: string;
  type: 'BUY' | 'SELL';
  amountIn: number;
  amountOut: number;
  price: number;
  fee: number;
  txHash?: string; // Only for real trades
  timestamp: number;
}

// Portfolio
interface Portfolio {
  totalValue: number;
  pnl: number;
  pnlPercentage: number;
  holdings: Holding[];
}

interface Holding {
  symbol: string;
  amount: number;
  value: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
}
```

---

## 🎨 Mock Data Structure

### tokens.json
```json
[
  {
    "symbol": "BONK",
    "name": "Bonk",
    "mintAddress": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "price": 0.00002341,
    "priceChange24h": 5.67,
    "priceChange7d": -12.34,
    "volume24h": 45000000,
    "liquidity": 8500000,
    "marketCap": 1450000000,
    "holders": 567890
  },
  {
    "symbol": "WIF",
    "name": "dogwifhat",
    "mintAddress": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    "price": 2.45,
    "priceChange24h": -3.21,
    "priceChange7d": 24.56,
    "volume24h": 120000000,
    "liquidity": 25000000,
    "marketCap": 2400000000,
    "holders": 234567
  },
  {
    "symbol": "POPCAT",
    "name": "Popcat",
    "mintAddress": "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    "price": 0.89,
    "priceChange24h": 15.43,
    "priceChange7d": 45.67,
    "volume24h": 35000000,
    "liquidity": 12000000,
    "marketCap": 870000000,
    "holders": 123456
  },
  {
    "symbol": "MYRO",
    "name": "Myro",
    "mintAddress": "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
    "price": 0.12,
    "priceChange24h": 8.90,
    "priceChange7d": -5.43,
    "volume24h": 18000000,
    "liquidity": 5600000,
    "marketCap": 120000000,
    "holders": 45678
  },
  {
    "symbol": "SAMO",
    "name": "Samoyedcoin",
    "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "price": 0.0089,
    "priceChange24h": -2.15,
    "priceChange7d": 8.90,
    "volume24h": 5600000,
    "liquidity": 3200000,
    "marketCap": 35000000,
    "holders": 78901
  }
]
```

### analysis.json (Sample AI Responses)
```json
{
  "BONK": {
    "decision": "NO_BUY",
    "confidence": 45,
    "reasoning": "RSI at 72 indicates overbought conditions. Volume declining over past 7 days suggests weakening momentum. Wait for pullback to better entry.",
    "riskLevel": "HIGH",
    "indicators": {
      "rsi": 72,
      "volumeTrend": "DECREASING",
      "priceAction": "Consolidating after recent pump"
    }
  },
  "WIF": {
    "decision": "BUY",
    "confidence": 78,
    "reasoning": "Strong 7-day momentum with healthy RSI at 58. High liquidity ($25M) reduces slippage risk. Volume increasing suggests continued interest.",
    "riskLevel": "MEDIUM",
    "indicators": {
      "rsi": 58,
      "volumeTrend": "INCREASING",
      "priceAction": "Uptrend with higher highs"
    }
  },
  "POPCAT": {
    "decision": "BUY",
    "confidence": 85,
    "reasoning": "Exceptional momentum with 45% weekly gain. RSI at 65 still has room to run. Strong volume confirms trend. Good liquidity for entry/exit.",
    "riskLevel": "MEDIUM",
    "indicators": {
      "rsi": 65,
      "volumeTrend": "INCREASING",
      "priceAction": "Strong uptrend breakout"
    }
  }
}
```

---

## 🔒 Security Considerations

### Phase 1 (Frontend Only)
- No real wallet connections
- All data is mocked
- No sensitive information stored

### Phase 2 (Backend Integration)
1. **Environment Variables**
   - Never commit API keys to Git
   - Use `.env` files with `.gitignore`
   
2. **Wallet Security**
   - Use Solana devnet only for testing
   - Implement read-only mode first
   - Hardware wallet support for mainnet

3. **API Security**
   - Rate limiting on all endpoints
   - Input validation
   - CORS configuration

4. **Trading Safety**
   - Maximum position size limits
   - Stop-loss mechanisms
   - Paper trading mode toggle

---

## 📊 Success Metrics for Grant

### Phase 1 Demo Metrics
- [ ] Interactive UI with 5+ mock tokens
- [ ] Real-time chart updates (simulated)
- [ ] AI analysis visualization
- [ ] Paper trading with portfolio tracking
- [ ] Mobile-responsive design

### Phase 2 Integration Metrics
- [ ] <500ms API response times
- [ ] 99%+ uptime for data fetching
- [ ] Successful Jupiter API integration
- [ ] Backtesting on 30+ days historical data
- [ ] Paper trading with simulated P&L tracking

---

## 🛠 Development Setup

### Phase 1: Frontend
```bash
# Create Next.js project
npx create-next-app@latest frontend --typescript --tailwind --app

# Install dependencies
cd frontend
npm install zustand recharts @tanstack/react-query lucide-react

# Add shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card table tabs badge

# Start development
npm run dev
```

### Phase 2: Backend
```bash
# Create Python environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn solana httpx pandas ta groq apscheduler python-dotenv sqlalchemy

# Start server
uvicorn app.main:app --reload
```

---

## 📅 Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Phase 1 | Project setup, Token table, Basic charts |
| 2 | Phase 1 | AI panel, Trade simulator, Polish UI |
| 3 | Phase 2 | Backend setup, Data fetchers, AI integration |
| 4 | Phase 2 | Jupiter integration, Paper trading, Testing |

---

## 👥 Parallel Agent Development Model

### Agent Assignment Strategy

We use **4 specialized agents** working in parallel to maximize development velocity:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARALLEL DEVELOPMENT AGENTS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │
│  │   🎨 AGENT 1    │  │   🔌 AGENT 2    │  │   🤖 AGENT 3    │  │🔗 AGENT 4│ │
│  │   UI/FRONTEND   │  │  DATA SERVICE   │  │   AI SERVICE    │  │ TRADING │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────┤ │
│  │ • React/Next.js │  │ • Data Fetchers │  │ • Groq/LLM API  │  │• Jupiter│ │
│  │ • Components    │  │ • Binance API   │  │ • Analysis      │  │• Solana │ │
│  │ • Charts        │  │ • Birdeye API   │  │ • Prompts       │  │• Wallet │ │
│  │ • Mock Data     │  │ • Caching       │  │ • Scoring       │  │• Trades │ │
│  │ • Feature Flags │  │ • WebSockets    │  │ • Backtesting   │  │• Safety │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────┬────┘ │
│           │                    │                    │                │      │
│           └────────────────────┴────────────────────┴────────────────┘      │
│                                      │                                       │
│                              ┌───────▼───────┐                              │
│                              │  INTEGRATION  │                              │
│                              │    POINT      │                              │
│                              │ (Feature Flag │                              │
│                              │   Toggle)     │                              │
│                              └───────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent 1: UI/Frontend Specialist
**Focus:** User Interface & Experience

| Task | Priority | Status |
|------|----------|--------|
| Next.js project setup | P0 | 🔲 |
| Token dashboard table | P0 | 🔲 |
| Price charts (Recharts) | P0 | 🔲 |
| AI analysis panel | P1 | 🔲 |
| Trade simulator UI | P1 | 🔲 |
| Portfolio view | P1 | 🔲 |
| Feature flag system | P0 | 🔲 |
| Mock data layer | P0 | 🔲 |
| Responsive design | P2 | 🔲 |
| Dark/Light theme | P2 | 🔲 |

**Key Files:**
- `frontend/lib/feature-flags.ts`
- `frontend/lib/api.ts` (with mock/real toggle)
- `frontend/components/*`

---

### Agent 2: Data Service Specialist
**Focus:** External APIs & Data Pipeline

| Task | Priority | Status |
|------|----------|--------|
| FastAPI project setup | P0 | 🔲 |
| Binance OHLCV fetcher | P0 | 🔲 |
| Birdeye token fetcher | P0 | 🔲 |
| Jupiter quote fetcher | P1 | 🔲 |
| Redis caching layer | P1 | 🔲 |
| WebSocket streaming | P2 | 🔲 |
| Rate limit handler | P0 | 🔲 |
| Data normalization | P1 | 🔲 |

**Key Files:**
- `backend/app/services/data_fetcher.py`
- `backend/app/routers/tokens.py`
- `backend/app/utils/cache.py`

---

### Agent 3: AI Service Specialist
**Focus:** LLM Integration & Analysis

| Task | Priority | Status |
|------|----------|--------|
| Groq API integration | P0 | ✅ |
| Analysis prompt design | P0 | ✅ |
| JSON response parsing | P0 | ✅ |
| Confidence scoring | P1 | ✅ |
| Risk assessment logic | P1 | ✅ |
| Technical indicators | P1 | ✅ |
| Backtesting engine | P2 | ✅ |
| Ollama fallback | P2 | ✅ |

**Key Files:**
- `backend/app/services/ai_analyzer.py`
- `backend/app/services/prompts.py`
- `backend/app/services/confidence.py`
- `backend/app/services/risk.py`
- `backend/app/services/backtest.py`
- `backend/app/routers/analysis.py`
- `backend/app/schemas/analysis.py`
- `backend/tests/test_ai_analysis.py`

---

### Agent 4: Trading Service Specialist
**Focus:** Blockchain & Trade Execution

| Task | Priority | Status |
|------|----------|--------|
| Solana.py setup | P0 | 🔲 |
| Jupiter swap API | P0 | 🔲 |
| Paper trading mode | P0 | 🔲 |
| Wallet management | P1 | 🔲 |
| Transaction signing | P1 | 🔲 |
| Position tracking | P1 | 🔲 |
| Stop-loss logic | P2 | 🔲 |
| Portfolio sync | P1 | 🔲 |

**Key Files:**
- `backend/app/services/trader.py`
- `backend/app/routers/trades.py`
- `backend/app/routers/portfolio.py`

---

## 🚩 Feature Flag System

### Frontend Feature Flags Configuration

```typescript
// frontend/lib/feature-flags.ts

export interface FeatureFlags {
  // API Mode
  USE_REAL_API: boolean;           // false = mock, true = real backend
  
  // Feature Toggles
  ENABLE_TRADING: boolean;         // Enable/disable trade execution
  ENABLE_AI_ANALYSIS: boolean;     // Enable/disable AI features
  ENABLE_WEBSOCKET: boolean;       // Real-time updates
  ENABLE_PORTFOLIO: boolean;       // Portfolio tracking
  
  // Environment
  USE_DEVNET: boolean;             // Solana devnet vs mainnet
  DEBUG_MODE: boolean;             // Verbose logging
}

// Default configuration (Phase 1 - Mock Mode)
export const defaultFlags: FeatureFlags = {
  USE_REAL_API: false,
  ENABLE_TRADING: true,
  ENABLE_AI_ANALYSIS: true,
  ENABLE_WEBSOCKET: false,
  ENABLE_PORTFOLIO: true,
  USE_DEVNET: true,
  DEBUG_MODE: true,
};

// Production configuration (Phase 2 - Real API)
export const productionFlags: FeatureFlags = {
  USE_REAL_API: true,
  ENABLE_TRADING: true,
  ENABLE_AI_ANALYSIS: true,
  ENABLE_WEBSOCKET: true,
  ENABLE_PORTFOLIO: true,
  USE_DEVNET: false,
  DEBUG_MODE: false,
};

// Get current flags based on environment
export function getFeatureFlags(): FeatureFlags {
  const env = process.env.NEXT_PUBLIC_ENV || 'development';
  
  if (env === 'production') {
    return productionFlags;
  }
  
  // Override from environment variables
  return {
    USE_REAL_API: process.env.NEXT_PUBLIC_USE_REAL_API === 'true',
    ENABLE_TRADING: process.env.NEXT_PUBLIC_ENABLE_TRADING !== 'false',
    ENABLE_AI_ANALYSIS: process.env.NEXT_PUBLIC_ENABLE_AI !== 'false',
    ENABLE_WEBSOCKET: process.env.NEXT_PUBLIC_ENABLE_WS === 'true',
    ENABLE_PORTFOLIO: process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO !== 'false',
    USE_DEVNET: process.env.NEXT_PUBLIC_USE_DEVNET !== 'false',
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG === 'true',
  };
}
```

### API Client with Feature Flag Toggle

```typescript
// frontend/lib/api.ts

import { getFeatureFlags } from './feature-flags';
import { mockTokens, mockAnalysis, mockOHLCV } from './mock-data';
import type { Token, AnalysisResponse, OHLCV, TradeResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private flags = getFeatureFlags();

  // Token endpoints
  async getTokens(): Promise<Token[]> {
    if (!this.flags.USE_REAL_API) {
      // Return mock data
      await this.simulateDelay();
      return mockTokens;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/tokens`);
    return response.json();
  }

  async getTokenOHLCV(symbol: string, interval: string = '1h'): Promise<OHLCV[]> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay();
      return mockOHLCV[symbol] || mockOHLCV['default'];
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/tokens/${symbol}/ohlcv?interval=${interval}`
    );
    return response.json();
  }

  // AI Analysis endpoint
  async analyzeToken(symbol: string): Promise<AnalysisResponse> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(1500); // Simulate AI thinking time
      return mockAnalysis[symbol] || mockAnalysis['default'];
    }
    
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    });
    return response.json();
  }

  // Trade endpoint
  async executeTrade(
    symbol: string, 
    type: 'BUY' | 'SELL', 
    amount: number
  ): Promise<TradeResponse> {
    if (!this.flags.USE_REAL_API) {
      await this.simulateDelay(800);
      return this.generateMockTrade(symbol, type, amount);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, type, amount, slippageBps: 50 }),
    });
    return response.json();
  }

  // Helper methods
  private async simulateDelay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateMockTrade(
    symbol: string, 
    type: 'BUY' | 'SELL', 
    amount: number
  ): TradeResponse {
    const token = mockTokens.find(t => t.symbol === symbol);
    const price = token?.price || 1;
    
    return {
      id: `trade_${Date.now()}`,
      status: 'EXECUTED',
      symbol,
      type,
      amountIn: amount,
      amountOut: type === 'BUY' ? amount / price : amount * price,
      price,
      fee: amount * 0.003, // 0.3% fee
      timestamp: Date.now(),
    };
  }
}

export const api = new APIClient();
```

### Environment Files

```bash
# frontend/.env.development (Phase 1 - Mock Mode)
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_USE_REAL_API=false
NEXT_PUBLIC_ENABLE_TRADING=true
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_WS=false
NEXT_PUBLIC_ENABLE_PORTFOLIO=true
NEXT_PUBLIC_USE_DEVNET=true
NEXT_PUBLIC_DEBUG=true

# frontend/.env.production (Phase 2 - Real API)
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_ENABLE_TRADING=true
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_WS=true
NEXT_PUBLIC_ENABLE_PORTFOLIO=true
NEXT_PUBLIC_USE_DEVNET=true
NEXT_PUBLIC_DEBUG=false
```

---

## 🐳 Docker Deployment

### Project Structure with Docker

```
stable-coin-trading/
├── docker-compose.yml           # Orchestration
├── docker-compose.dev.yml       # Development overrides
├── docker-compose.prod.yml      # Production overrides
├── .env                         # Environment variables
├── .env.example                 # Example env file
│
├── frontend/
│   ├── Dockerfile               # Frontend container
│   ├── Dockerfile.dev           # Dev container with hot reload
│   ├── .dockerignore
│   └── ...
│
├── backend/
│   ├── Dockerfile               # Backend container
│   ├── Dockerfile.dev           # Dev container with hot reload
│   ├── .dockerignore
│   └── ...
│
└── nginx/
    ├── nginx.conf               # Reverse proxy config
    └── Dockerfile
```

### docker-compose.yml (Main Orchestration)

```yaml
version: '3.8'

services:
  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
      - NEXT_PUBLIC_USE_REAL_API=${USE_REAL_API:-false}
      - NEXT_PUBLIC_ENV=${NODE_ENV:-development}
    depends_on:
      - backend
    networks:
      - app-network
    restart: unless-stopped

  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - BINANCE_API_URL=https://api.binance.com/api/v3
      - JUPITER_API_URL=https://quote-api.jup.ag/v6
      - BIRDEYE_API_KEY=${BIRDEYE_API_KEY}
      - DATABASE_URL=sqlite:///./data/trading.db
      - REDIS_URL=redis://redis:6379
      - SOLANA_RPC_URL=${SOLANA_RPC_URL:-https://api.devnet.solana.com}
    volumes:
      - backend-data:/app/data
    depends_on:
      - redis
    networks:
      - app-network
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network
    restart: unless-stopped

  # Nginx Reverse Proxy (Production)
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    networks:
      - app-network
    restart: unless-stopped
    profiles:
      - production

volumes:
  backend-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### docker-compose.dev.yml (Development Overrides)

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NEXT_PUBLIC_USE_REAL_API=false
      - WATCHPACK_POLLING=true

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Frontend Dockerfile.dev (Development)

```dockerfile
# frontend/Dockerfile.dev

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code (will be overridden by volume mount)
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Backend Dockerfile.dev (Development)

```dockerfile
# backend/Dockerfile.dev

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install dev dependencies
RUN pip install watchfiles

# Copy application code (will be overridden by volume mount)
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Nginx Configuration

```nginx
# nginx/nginx.conf

upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name localhost;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Environment File Template

```bash
# .env.example

# ============================================
# API Keys (Required for Phase 2)
# ============================================
GROQ_API_KEY=your_groq_api_key_here
BIRDEYE_API_KEY=your_birdeye_api_key_here

# ============================================
# Solana Configuration
# ============================================
SOLANA_RPC_URL=https://api.devnet.solana.com
# For mainnet: https://api.mainnet-beta.solana.com

# ============================================
# Feature Flags
# ============================================
USE_REAL_API=false
NODE_ENV=development

# ============================================
# Database
# ============================================
DATABASE_URL=sqlite:///./data/trading.db

# ============================================
# Redis Cache
# ============================================
REDIS_URL=redis://redis:6379
```

### Docker Commands Cheat Sheet

```bash
# ============================================
# Development Mode (Phase 1 - Mock Data)
# ============================================

# Start all services in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# ============================================
# Production Mode (Phase 2 - Real API)
# ============================================

# Build and start production containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d --build

# Scale backend for load
docker-compose up -d --scale backend=3

# ============================================
# Switch from Mock to Real API
# ============================================

# Update .env file
echo "USE_REAL_API=true" >> .env

# Restart frontend to pick up new env
docker-compose restart frontend

# ============================================
# Useful Commands
# ============================================

# Rebuild specific service
docker-compose build frontend

# Enter container shell
docker-compose exec backend bash

# View container stats
docker stats

# Clean up everything
docker-compose down -v --rmi all
```

---

## 🔄 Agent Coordination Workflow

### Phase 1 Integration Points

```
Week 1-2: Parallel Development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent 1 (UI)          Agent 2 (Data)       Agent 3 (AI)        Agent 4 (Trade)
    │                      │                    │                    │
    ▼                      ▼                    ▼                    ▼
┌─────────┐           ┌─────────┐          ┌─────────┐         ┌─────────┐
│ Build   │           │ Setup   │          │ Design  │         │ Setup   │
│ Mock UI │           │ FastAPI │          │ Prompts │         │ Jupiter │
│ + Flags │           │ + Fetch │          │ + Parse │         │ + Paper │
└────┬────┘           └────┬────┘          └────┬────┘         └────┬────┘
     │                     │                    │                    │
     │                     ▼                    ▼                    ▼
     │               ┌─────────────────────────────────────────────────┐
     │               │           Backend Integration Testing            │
     │               │    (Agents 2, 3, 4 verify endpoints work)       │
     │               └─────────────────────────────────────────────────┘
     │                                    │
     ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION CHECKPOINT                          │
│  • UI Agent: Set USE_REAL_API=true in .env                             │
│  • Test all endpoints against real backend                             │
│  • Verify Docker deployment works                                       │
└────────────────────────────────────────────────────────────────────────┘
```

### Agent Sync Meetings

| Day | Focus | Attendees |
|-----|-------|-----------|
| Day 1 | Kickoff, API contract agreement | All |
| Day 3 | UI progress review | Agent 1 |
| Day 5 | Backend endpoint testing | Agent 2, 3, 4 |
| Day 7 | Integration checkpoint | All |
| Day 10 | Feature flag toggle test | All |
| Day 14 | Final demo preparation | All |

---

## 🎯 Grant Application Highlights

1. **Innovative Use of AI** - LLM-powered trading decisions
2. **Solana Native** - Built specifically for Solana ecosystem
3. **Open Source** - Fully transparent codebase
4. **Educational** - Demonstrates best practices
5. **Scalable** - Architecture supports production deployment

---

## 📝 Next Steps

1. **Immediate:** Scaffold Phase 1 frontend project
2. **Week 1:** Complete token dashboard and charts
3. **Week 2:** Add AI analysis panel and trade simulator
4. **Week 3:** Begin Phase 2 backend development
5. **Week 4:** Integration and testing

---

*This architecture document serves as the technical foundation for the Solana grant application. All components are designed for rapid iteration and demonstration.*
