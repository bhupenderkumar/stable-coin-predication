# 🚀 Solana Meme Coin Trading Bot

An AI-powered trading bot for Solana meme coins. Uses real market data from CoinGecko and provides AI-driven analysis using Groq LLM.

## Features

- 📊 **Real-Time Prices** - Live market data from CoinGecko API
- 🤖 **AI Analysis** - Trading recommendations powered by Groq LLM
- 💰 **Paper Trading** - Practice with $10,000 virtual money
- 📈 **Price Charts** - OHLCV candlestick charts from Binance
- 👛 **Portfolio Tracking** - Track holdings and P&L

## Supported Tokens

| Symbol | Name |
|--------|------|
| BONK | Bonk |
| WIF | dogwifhat |
| POPCAT | Popcat |
| MEW | cat in a dogs world |
| BOME | BOOK OF MEME |
| SAMO | Samoyedcoin |
| PONKE | Ponke |
| MYRO | Myro |
| SLERF | Slerf |
| WEN | Wen |

## Quick Start

```bash
# Start backend
cd backend
pip install -r requirements.txt
PYTHONPATH=. python3 -m uvicorn app.main:app --reload --port 8000

# Start frontend
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Backend**: FastAPI, Python, SQLite
- **APIs**: CoinGecko (prices), Binance (charts), Groq (AI)

