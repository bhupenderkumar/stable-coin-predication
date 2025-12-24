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

## Local Solana Development (Recommended)

Since the Solana Devnet faucet is often rate-limited, it is highly recommended to use a local validator for development.

### 1. Install Solana CLI

**Option A: Homebrew (macOS - Recommended)**
```bash
brew install solana
```

**Option B: Curl (Linux/macOS)**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```
*If the above link fails, check [Solana GitHub Releases](https://github.com/solana-labs/solana/releases) for binaries.*

Restart your terminal after installation.

### 2. Start Local Validator
Run this in a separate terminal window:
```bash
solana-test-validator
```

### 3. Configure for Local Development
Set your environment to use the local validator:

```bash
# Configure Solana CLI
solana config set --url localhost

# Airdrop fake SOL to your wallet
solana airdrop 100
```

Update your `.env` file in the `backend` directory:
```env
SOLANA_RPC_URL=http://127.0.0.1:8899
```

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Backend**: FastAPI, Python, SQLite
- **APIs**: CoinGecko (prices), Binance (charts), Groq (AI)

