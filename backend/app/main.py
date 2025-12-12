"""
Main FastAPI Application Entry Point

Solana Meme Coin Trading Bot - Backend API
Agent 2: Data Service Specialist

This is the main entry point for the FastAPI backend.
It initializes all services, routes, and middleware.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db
from app.utils.cache import cache
from app.services.scheduler import scheduler_service, refresh_token_cache

# Import routers
from app.routers import tokens, analysis, trades, portfolio


# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Manages startup and shutdown events.
    """
    # Startup
    print("🚀 Starting Solana Meme Coin Trading Bot API...")
    
    # Initialize database
    print("📦 Initializing database...")
    init_db()
    
    # Connect to Redis cache
    print("🔗 Connecting to Redis cache...")
    await cache.connect()
    
    # Start scheduler
    print("⏰ Starting background scheduler...")
    scheduler_service.start()
    
    # Add scheduled tasks
    scheduler_service.add_interval_job(
        refresh_token_cache,
        seconds=120,
        job_id="refresh_tokens"
    )
    
    print("✅ API ready!")
    print(f"📍 Environment: {settings.env}")
    print(f"🔧 Debug mode: {settings.debug}")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    scheduler_service.stop()
    await cache.disconnect()
    print("👋 Goodbye!")


# Create FastAPI application
app = FastAPI(
    title="Solana Meme Coin Trading Bot API",
    description="""
    AI-powered meme coin trading bot on Solana.
    
    ## Features
    - 📊 Real-time token data from Binance & Birdeye
    - 🤖 AI-powered trading analysis (Groq/Llama 3.1)
    - 💱 Jupiter swap integration
    - 📈 Technical indicators (RSI, MACD, etc.)
    - 💼 Paper trading mode
    
    ## Agents
    This API is built by Agent 2 (Data Service Specialist) as part of
    the parallel agent development model.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite
        "*"  # Allow all in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions."""
    if settings.debug:
        return JSONResponse(
            status_code=500,
            content={
                "error": str(exc),
                "type": type(exc).__name__,
                "path": str(request.url)
            }
        )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.env,
        "version": "1.0.0"
    }


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Solana Meme Coin Trading Bot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "tokens": "/api/tokens",
            "analysis": "/api/analysis",
            "trades": "/api/trades",
            "portfolio": "/api/portfolio"
        }
    }


# Include routers with /api prefix
app.include_router(tokens.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(trades.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")


# Development-only endpoints
if settings.debug:
    @app.get("/api/debug/config", tags=["debug"])
    async def debug_config():
        """Debug endpoint to view configuration."""
        return {
            "binance_url": settings.binance_api_url,
            "jupiter_url": settings.jupiter_api_url,
            "birdeye_url": settings.birdeye_api_url,
            "cache_ttl": settings.cache_ttl_seconds,
            "has_groq_key": bool(settings.groq_api_key),
            "has_birdeye_key": bool(settings.birdeye_api_key),
            "solana_rpc": settings.solana_rpc_url
        }
    
    @app.get("/api/debug/scheduler", tags=["debug"])
    async def debug_scheduler():
        """Debug endpoint to view scheduled jobs."""
        return {
            "jobs": scheduler_service.get_jobs()
        }


# Run with: uvicorn app.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
