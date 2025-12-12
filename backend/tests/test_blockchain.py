"""
Blockchain Integration Tests

Agent 4: Blockchain/Solana Specialist

Tests for:
- Wallet service
- Jupiter service  
- Transaction service
- Blockchain router endpoints
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.wallet import WalletService, wallet_service
from app.services.jupiter import JupiterService, jupiter_service
from app.services.transaction import TransactionService, transaction_service


client = TestClient(app)


# ============== Test Constants ==============

TEST_WALLET = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
TEST_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # USDC
TEST_SIGNATURE = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"


# ============== Wallet Service Tests ==============

class TestWalletService:
    """Tests for WalletService."""
    
    def test_wallet_service_init(self):
        """Test wallet service initialization."""
        service = WalletService()
        assert service.rpc_url is not None
        assert service._connected_wallet is None
        assert service._wallet_mode == "readonly"
    
    def test_connect_wallet(self):
        """Test wallet connection."""
        service = WalletService()
        result = service.connect_wallet(TEST_WALLET, "readonly")
        
        assert result["connected"] is True
        assert result["address"] == TEST_WALLET
        assert result["mode"] == "readonly"
    
    def test_disconnect_wallet(self):
        """Test wallet disconnection."""
        service = WalletService()
        service.connect_wallet(TEST_WALLET)
        result = service.disconnect_wallet()
        
        assert result["disconnected"] is True
        assert result["previousAddress"] == TEST_WALLET
    
    def test_get_connected_wallet_none(self):
        """Test getting connected wallet when none connected."""
        service = WalletService()
        result = service.get_connected_wallet()
        assert result is None
    
    def test_get_connected_wallet(self):
        """Test getting connected wallet."""
        service = WalletService()
        service.connect_wallet(TEST_WALLET)
        result = service.get_connected_wallet()
        
        assert result["address"] == TEST_WALLET
        assert result["isConnected"] is True
    
    @pytest.mark.asyncio
    async def test_get_sol_balance_mock(self):
        """Test SOL balance fetching with mocked RPC."""
        service = WalletService()
        
        with patch.object(service, '_rpc_call') as mock_rpc:
            mock_rpc.return_value = {"value": 1000000000}  # 1 SOL
            
            result = await service.get_sol_balance(TEST_WALLET)
            
            assert result is not None
            assert result["lamports"] == 1000000000
            assert result["sol"] == 1.0
    
    @pytest.mark.asyncio
    async def test_get_token_balance_mock(self):
        """Test token balance fetching with mocked RPC."""
        service = WalletService()
        
        mock_result = {
            "value": [{
                "pubkey": "TokenAccount123",
                "account": {
                    "data": {
                        "parsed": {
                            "info": {
                                "tokenAmount": {
                                    "amount": "1000000",
                                    "decimals": 6,
                                    "uiAmount": 1.0
                                }
                            }
                        }
                    }
                }
            }]
        }
        
        with patch.object(service, '_rpc_call') as mock_rpc:
            mock_rpc.return_value = mock_result
            
            result = await service.get_token_balance(TEST_WALLET, TEST_MINT)
            
            assert result is not None
            assert result["uiAmount"] == 1.0
    
    @pytest.mark.asyncio
    async def test_get_token_balance_empty(self):
        """Test token balance when no token account exists."""
        service = WalletService()
        
        with patch.object(service, '_rpc_call') as mock_rpc:
            mock_rpc.return_value = {"value": []}
            
            result = await service.get_token_balance(TEST_WALLET, TEST_MINT)
            
            assert result["amount"] == 0
            assert result["uiAmount"] == 0.0
    
    @pytest.mark.asyncio
    async def test_check_wallet_health_mock(self):
        """Test wallet health check with mocked data."""
        service = WalletService()
        
        with patch.object(service, 'get_sol_balance') as mock_balance:
            mock_balance.return_value = {"sol": 0.5, "lamports": 500000000}
            
            with patch.object(service, 'get_token_accounts') as mock_accounts:
                mock_accounts.return_value = [{"mint": TEST_MINT}]
                
                result = await service.check_wallet_health(TEST_WALLET)
                
                assert result["isValid"] is True
                assert result["hasEnoughSol"] is True
                assert result["tokenAccountCount"] == 1


# ============== Jupiter Service Tests ==============

class TestJupiterService:
    """Tests for JupiterService."""
    
    def test_jupiter_service_init(self):
        """Test Jupiter service initialization."""
        service = JupiterService()
        assert service.base_url is not None
        assert service.SOL_MINT is not None
        assert service.USDC_MINT is not None
    
    def test_get_token_address_sol(self):
        """Test getting SOL address."""
        service = JupiterService()
        address = service.get_token_address("SOL")
        assert address == service.SOL_MINT
    
    def test_get_token_address_usdc(self):
        """Test getting USDC address."""
        service = JupiterService()
        address = service.get_token_address("USDC")
        assert address == service.USDC_MINT
    
    def test_get_token_address_meme(self):
        """Test getting meme token address."""
        service = JupiterService()
        address = service.get_token_address("BONK")
        assert address == service.MEME_TOKENS["BONK"]
    
    def test_get_token_address_unknown(self):
        """Test getting unknown token address."""
        service = JupiterService()
        address = service.get_token_address("UNKNOWN_TOKEN")
        assert address is None
    
    def test_calculate_effective_price(self):
        """Test effective price calculation."""
        service = JupiterService()
        
        quote = {"inAmount": 1000000, "outAmount": 500000}
        price = service._calculate_effective_price(quote)
        assert price == 0.5
    
    def test_get_swap_warnings_high_impact(self):
        """Test swap warnings for high price impact."""
        service = JupiterService()
        
        quote = {"priceImpactPct": 6.0, "routeCount": 1}
        warnings = service._get_swap_warnings(quote)
        
        assert len(warnings) >= 1
        assert "High price impact" in warnings[0]
    
    def test_get_swap_warnings_complex_route(self):
        """Test swap warnings for complex route."""
        service = JupiterService()
        
        quote = {"priceImpactPct": 0.1, "routeCount": 5}
        warnings = service._get_swap_warnings(quote)
        
        assert len(warnings) >= 1
        assert "Complex route" in warnings[0]
    
    @pytest.mark.asyncio
    async def test_get_quote_mock(self):
        """Test quote fetching with mocked API."""
        service = JupiterService()
        
        mock_quote = {
            "inputMint": service.SOL_MINT,
            "outputMint": service.USDC_MINT,
            "inAmount": "1000000000",
            "outAmount": "100000000",
            "priceImpactPct": "0.5",
            "routePlan": [{"swapInfo": {}}],
            "slippageBps": 50
        }
        
        with patch.object(service, '_api_call') as mock_api:
            mock_api.return_value = mock_quote
            
            result = await service.get_quote(
                input_mint=service.SOL_MINT,
                output_mint=service.USDC_MINT,
                amount=1000000000
            )
            
            assert result is not None
            assert result["inputMint"] == service.SOL_MINT
            assert result["routeCount"] == 1
    
    @pytest.mark.asyncio
    async def test_simulate_swap_mock(self):
        """Test swap simulation with mocked data."""
        service = JupiterService()
        
        with patch.object(service, 'get_quote') as mock_quote:
            mock_quote.return_value = {
                "inputMint": service.SOL_MINT,
                "outputMint": service.USDC_MINT,
                "inAmount": 1000000000,
                "outAmount": 100000000,
                "priceImpactPct": 0.5,
                "routeCount": 1,
                "effectivePrice": 0.1
            }
            
            result = await service.simulate_swap(
                input_mint=service.SOL_MINT,
                output_mint=service.USDC_MINT,
                amount=1000000000
            )
            
            assert result["success"] is True
            assert "uiInAmount" in result
            assert "uiOutAmount" in result
    
    @pytest.mark.asyncio
    async def test_simulate_swap_no_quote(self):
        """Test swap simulation when quote fails."""
        service = JupiterService()
        
        with patch.object(service, 'get_quote') as mock_quote:
            mock_quote.return_value = None
            
            result = await service.simulate_swap(
                input_mint=service.SOL_MINT,
                output_mint=service.USDC_MINT,
                amount=1000000000
            )
            
            assert result["success"] is False
            assert "error" in result


# ============== Transaction Service Tests ==============

class TestTransactionService:
    """Tests for TransactionService."""
    
    def test_transaction_service_init(self):
        """Test transaction service initialization."""
        service = TransactionService()
        assert service.rpc_url is not None
        assert service.timeout == 30.0
    
    @pytest.mark.asyncio
    async def test_get_recent_blockhash_mock(self):
        """Test blockhash fetching with mocked RPC."""
        service = TransactionService()
        
        mock_result = {
            "value": {
                "blockhash": "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnb",
                "lastValidBlockHeight": 150000000
            }
        }
        
        with patch.object(service, '_rpc_call') as mock_rpc:
            mock_rpc.return_value = mock_result
            
            result = await service.get_recent_blockhash()
            
            assert result is not None
            assert "blockhash" in result
            assert "lastValidBlockHeight" in result
    
    @pytest.mark.asyncio
    async def test_get_transaction_status_mock(self):
        """Test transaction status with mocked RPC."""
        service = TransactionService()
        
        mock_result = {
            "value": [{
                "slot": 150000000,
                "confirmations": 10,
                "confirmationStatus": "finalized",
                "err": None
            }]
        }
        
        with patch.object(service, '_rpc_call') as mock_rpc:
            mock_rpc.return_value = mock_result
            
            result = await service.get_transaction_status(TEST_SIGNATURE)
            
            assert result["found"] is True
            assert result["confirmationStatus"] == "finalized"
            assert result["isError"] is False
    
    @pytest.mark.asyncio
    async def test_get_transaction_status_not_found(self):
        """Test transaction status when not found."""
        service = TransactionService()
        
        with patch.object(service, '_rpc_call') as mock_rpc:
            mock_rpc.return_value = {"value": [None]}
            
            result = await service.get_transaction_status(TEST_SIGNATURE)
            
            assert result["found"] is False
            assert result["status"] == "not_found"
    
    @pytest.mark.asyncio
    async def test_get_priority_fee_default(self):
        """Test priority fee with default values."""
        service = TransactionService()
        
        with patch.object(service, '_rpc_call') as mock_rpc:
            mock_rpc.return_value = []
            
            result = await service.get_priority_fee()
            
            assert "min" in result
            assert "low" in result
            assert "medium" in result
            assert "high" in result
            assert "recommended" in result
    
    @pytest.mark.asyncio
    async def test_get_health_mock(self):
        """Test health check with mocked RPC."""
        service = TransactionService()
        
        with patch.object(service, 'get_slot') as mock_slot:
            mock_slot.return_value = 150000000
            
            with patch.object(service, 'get_block_height') as mock_height:
                mock_height.return_value = 150000000
                
                with patch.object(service, 'get_recent_blockhash') as mock_hash:
                    mock_hash.return_value = {"blockhash": "test123"}
                    
                    result = await service.get_health()
                    
                    assert result["healthy"] is True
                    assert result["slot"] == 150000000


# ============== Router Endpoint Tests ==============

class TestBlockchainRouter:
    """Tests for blockchain router endpoints."""
    
    def test_get_constants(self):
        """Test constants endpoint."""
        response = client.get("/api/blockchain/constants")
        
        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert "memeTokens" in data
        assert "decimals" in data
    
    def test_wallet_connect(self):
        """Test wallet connect endpoint."""
        response = client.post(
            "/api/blockchain/wallet/connect",
            json={"address": TEST_WALLET, "mode": "readonly"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert data["address"] == TEST_WALLET
    
    def test_wallet_disconnect(self):
        """Test wallet disconnect endpoint."""
        # First connect
        client.post(
            "/api/blockchain/wallet/connect",
            json={"address": TEST_WALLET}
        )
        
        # Then disconnect
        response = client.post("/api/blockchain/wallet/disconnect")
        
        assert response.status_code == 200
        data = response.json()
        assert data["disconnected"] is True
    
    def test_get_connected_wallet_none(self):
        """Test getting connected wallet when none connected."""
        # Ensure disconnected first
        client.post("/api/blockchain/wallet/disconnect")
        
        response = client.get("/api/blockchain/wallet/connected")
        
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is False
    
    def test_get_token_address(self):
        """Test token address lookup."""
        response = client.get("/api/blockchain/swap/token-address/SOL")
        
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["symbol"] == "SOL"
        assert data["address"] is not None
    
    def test_get_token_address_unknown(self):
        """Test token address lookup for unknown token."""
        response = client.get("/api/blockchain/swap/token-address/UNKNOWN123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is False


# ============== Integration Tests (Require Network) ==============

class TestBlockchainIntegration:
    """Integration tests that require network access."""
    
    @pytest.mark.asyncio
    @pytest.mark.skipif(True, reason="Requires network access")
    async def test_get_sol_balance_real(self):
        """Test real SOL balance fetch from devnet."""
        result = await wallet_service.get_sol_balance(TEST_WALLET)
        assert result is not None
        assert "sol" in result
    
    @pytest.mark.asyncio
    @pytest.mark.skipif(True, reason="Requires network access")
    async def test_jupiter_quote_real(self):
        """Test real Jupiter quote."""
        result = await jupiter_service.get_quote(
            input_mint=jupiter_service.SOL_MINT,
            output_mint=jupiter_service.USDC_MINT,
            amount=100000000  # 0.1 SOL
        )
        assert result is not None
        assert "outAmount" in result
    
    @pytest.mark.asyncio
    @pytest.mark.skipif(True, reason="Requires network access")
    async def test_network_health_real(self):
        """Test real network health check."""
        result = await transaction_service.get_health()
        assert "healthy" in result


# ============== Edge Case Tests ==============

class TestEdgeCases:
    """Tests for edge cases and error handling."""
    
    def test_invalid_wallet_address(self):
        """Test handling of invalid wallet address."""
        response = client.get("/api/blockchain/wallet/balance/sol/invalid")
        # Should return 400 or handle gracefully
        assert response.status_code in [200, 400]
    
    def test_swap_quote_invalid_amount(self):
        """Test swap quote with invalid amount."""
        response = client.post(
            "/api/blockchain/swap/quote",
            json={
                "inputMint": jupiter_service.SOL_MINT,
                "outputMint": jupiter_service.USDC_MINT,
                "amount": -100,  # Invalid negative amount
                "slippageBps": 50
            }
        )
        assert response.status_code == 422  # Validation error
    
    def test_swap_quote_invalid_slippage(self):
        """Test swap quote with invalid slippage."""
        response = client.post(
            "/api/blockchain/swap/quote",
            json={
                "inputMint": jupiter_service.SOL_MINT,
                "outputMint": jupiter_service.USDC_MINT,
                "amount": 1000000000,
                "slippageBps": 5000  # Too high (max 1000)
            }
        )
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
