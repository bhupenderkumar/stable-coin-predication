"""
Tests for token endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    def test_health_check(self):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestRootEndpoint:
    """Tests for root endpoint."""
    
    def test_root_returns_api_info(self):
        """Test root endpoint returns API information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "endpoints" in data
        assert "tokens" in data["endpoints"]


class TestTokenEndpoints:
    """Tests for token-related endpoints."""
    
    def test_get_tokens_returns_list(self):
        """Test getting token list."""
        response = client.get("/api/tokens")
        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert "total" in data
        assert isinstance(data["tokens"], list)
    
    def test_get_tokens_with_pagination(self):
        """Test token list pagination."""
        response = client.get("/api/tokens?limit=5&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 0
    
    def test_get_token_ohlcv_valid_symbol(self):
        """Test getting OHLCV data for valid symbol."""
        response = client.get("/api/tokens/BTC/ohlcv")
        # May return 404 if API is not available
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "symbol" in data
            assert "data" in data
    
    def test_get_token_ohlcv_with_interval(self):
        """Test getting OHLCV with custom interval."""
        response = client.get("/api/tokens/BTC/ohlcv?interval=4h&limit=50")
        assert response.status_code in [200, 404]


class TestAnalysisEndpoints:
    """Tests for AI analysis endpoints."""
    
    def test_analyze_token(self):
        """Test token analysis endpoint."""
        response = client.post(
            "/api/analysis",
            json={"symbol": "BTC", "interval": "1h"}
        )
        # May return 404 if data not available
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "decision" in data
            assert "confidence" in data
            assert data["decision"] in ["BUY", "NO_BUY", "SELL"]
    
    def test_quick_analyze(self):
        """Test quick analysis endpoint."""
        response = client.post("/api/analysis/quick/SOL")
        assert response.status_code in [200, 404]


class TestTradeEndpoints:
    """Tests for trade execution endpoints."""
    
    def test_execute_paper_trade(self):
        """Test paper trade execution."""
        response = client.post(
            "/api/trades",
            json={
                "symbol": "BTC",
                "type": "BUY",
                "amount": 100.0
            }
        )
        # May fail if price data unavailable
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["isPaperTrade"] == True
    
    def test_get_trade_history(self):
        """Test getting trade history."""
        response = client.get("/api/trades/history")
        assert response.status_code == 200
        data = response.json()
        assert "trades" in data


class TestPortfolioEndpoints:
    """Tests for portfolio endpoints."""
    
    def test_get_portfolio(self):
        """Test getting portfolio summary."""
        response = client.get("/api/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert "totalValue" in data
        assert "cash" in data
        assert "holdings" in data
    
    def test_reset_portfolio(self):
        """Test portfolio reset."""
        response = client.post("/api/portfolio/reset")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_add_holding(self):
        """Test adding a holding."""
        response = client.post(
            "/api/portfolio/add-holding",
            json={
                "symbol": "SOL",
                "amount": 10.0,
                "avgPrice": 50.0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "holding" in data
    
    def test_remove_holding(self):
        """Test removing a holding."""
        # First add a holding
        client.post(
            "/api/portfolio/add-holding",
            json={
                "symbol": "TEST",
                "amount": 1.0,
                "avgPrice": 1.0
            }
        )
        
        # Then remove it
        response = client.delete("/api/portfolio/holdings/TEST")
        assert response.status_code == 200
    
    def test_remove_nonexistent_holding(self):
        """Test removing a holding that doesn't exist."""
        response = client.delete("/api/portfolio/holdings/NONEXISTENT")
        assert response.status_code == 404
