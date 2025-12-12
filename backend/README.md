# Solana Meme Coin Trading Bot - Backend

**Agent 2: Data Service Specialist**

FastAPI backend for the AI-powered meme coin trading bot on Solana.

## 🚀 Features

- **Data Fetching Service**: Real-time data from Binance, Birdeye, and Jupiter APIs
- **AI Analysis Service**: Groq/Llama 3.1 integration for trading signals
- **Trading Service**: Paper trading with Jupiter swap quotes
- **Redis Caching**: Response caching with configurable TTL
- **Rate Limiting**: Built-in rate limiters for external APIs
- **Technical Indicators**: RSI, MACD, SMA, Bollinger Bands, etc.

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models/              # SQLAlchemy models
│   │   ├── token.py
│   │   ├── trade.py
│   │   └── analysis.py
│   ├── routers/             # API endpoints
│   │   ├── tokens.py        # /api/tokens
│   │   ├── analysis.py      # /api/analysis
│   │   ├── trades.py        # /api/trades
│   │   └── portfolio.py     # /api/portfolio
│   ├── services/            # Business logic
│   │   ├── data_fetcher.py  # External API integration
│   │   ├── ai_analyzer.py   # LLM integration
│   │   ├── trader.py        # Trade execution
│   │   └── scheduler.py     # Background tasks
│   ├── schemas/             # Pydantic models
│   │   ├── token.py
│   │   ├── analysis.py
│   │   └── trade.py
│   └── utils/               # Utilities
│       ├── indicators.py    # Technical indicators
│       ├── validators.py    # Input validation
│       └── cache.py         # Redis caching
├── tests/                   # Test suite
├── requirements.txt
├── Dockerfile
├── Dockerfile.dev
└── .env.example
```

## 🛠 Quick Start

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn app.main:app --reload
```

### Docker

```bash
# Development with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

## 📡 API Endpoints

### Tokens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens` | List trending tokens |
| GET | `/api/tokens/{symbol}` | Get token details |
| GET | `/api/tokens/{symbol}/ohlcv` | Get OHLCV data |
| GET | `/api/tokens/{symbol}/analysis` | Get token with indicators |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis` | Request AI analysis |
| POST | `/api/analysis/quick/{symbol}` | Quick analysis |

### Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trades` | Execute trade (paper) |
| POST | `/api/trades/quote` | Get Jupiter quote |
| GET | `/api/trades/history` | Trade history |

### Portfolio
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio` | Portfolio summary |
| POST | `/api/portfolio/reset` | Reset portfolio |
| POST | `/api/portfolio/add-holding` | Add holding |
| DELETE | `/api/portfolio/holdings/{symbol}` | Remove holding |

## 🔧 Configuration

### Environment Variables

```bash
# API Keys
GROQ_API_KEY=your_groq_key          # Get from groq.com
BIRDEYE_API_KEY=your_birdeye_key    # Get from birdeye.so

# External APIs (defaults provided)
BINANCE_API_URL=https://api.binance.com/api/v3
JUPITER_API_URL=https://quote-api.jup.ag/v6
BIRDEYE_API_URL=https://public-api.birdeye.so

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com

# Database
DATABASE_URL=sqlite:///./data/trading.db

# Redis
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=60

# App
DEBUG=true
ENV=development
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_tokens.py -v
```

## 📊 Technical Indicators

The backend calculates these indicators:

- **RSI** (Relative Strength Index): 14-period default
- **SMA** (Simple Moving Average): 20-period
- **EMA** (Exponential Moving Average): 12-period
- **MACD**: 12/26/9 configuration
- **Bollinger Bands**: 20-period, 2 std dev
- **Volume Trend**: 7-period analysis
- **Support/Resistance**: 20-period pivots

## 🔒 Security

- Rate limiting on all endpoints
- Input validation with Pydantic
- CORS configuration
- Environment-based configuration
- No hardcoded secrets

## 📈 External APIs Used

| API | Purpose | Rate Limit | Key Required |
|-----|---------|------------|--------------|
| Binance | OHLCV data, ticker | 1200/min | No |
| Birdeye | Solana tokens | 100/min | Optional |
| Jupiter | Swap quotes | 600/min | No |
| Groq | AI analysis | 30/min | Yes |

## 🐳 Docker Commands

```bash
# Build backend only
docker build -t trading-bot-backend ./backend

# Run with Redis
docker-compose up backend redis -d

# View logs
docker-compose logs -f backend

# Enter container
docker-compose exec backend bash

# Run tests in container
docker-compose exec backend pytest
```

## 📝 Development Notes

- Uses SQLite by default (PostgreSQL for production)
- Redis caching is optional (falls back gracefully)
- Paper trading mode is default (no real transactions)
- All external API calls include error handling
- Background scheduler refreshes token cache every 2 minutes

---

*Built as part of the Solana Grant Application - Agent 2 (Data Service Specialist)*
