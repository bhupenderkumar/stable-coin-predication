"""
Wallet Service - Solana Wallet Integration

Agent 4: Blockchain/Solana Specialist

This service handles:
- Wallet creation and management
- Balance checking (SOL and SPL tokens)
- Token account discovery
- Keypair management (devnet/testing only)
"""

import os
import json
import base64
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.config import settings


class WalletService:
    """
    Solana wallet service for balance checking and account management.
    
    NOTE: This service is designed for DEVNET/TESTING only.
    For mainnet, use hardware wallets or secure key management.
    """
    
    # Well-known Solana token addresses
    SOL_MINT = "So11111111111111111111111111111111111111112"
    USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    
    # Token decimals
    TOKEN_DECIMALS = {
        "So11111111111111111111111111111111111111112": 9,  # SOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": 6,  # USDC
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": 6,  # USDT
    }
    
    def __init__(self):
        self.rpc_url = settings.solana_rpc_url
        self._connected_wallet: Optional[str] = None
        self._wallet_mode = "readonly"  # readonly, devnet, mainnet
    
    async def _rpc_call(self, method: str, params: List[Any]) -> Optional[Dict[str, Any]]:
        """Make a JSON-RPC call to Solana."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": method,
                    "params": params
                }
                response = await client.post(
                    self.rpc_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                data = response.json()
                
                if "error" in data:
                    print(f"RPC Error: {data['error']}")
                    return None
                
                return data.get("result")
        except Exception as e:
            print(f"RPC call error: {e}")
            return None
    
    async def get_sol_balance(self, wallet_address: str) -> Optional[Dict[str, Any]]:
        """
        Get SOL balance for a wallet address.
        
        Args:
            wallet_address: Solana wallet public key (base58)
            
        Returns:
            Balance info with lamports and SOL value
        """
        result = await self._rpc_call("getBalance", [wallet_address])
        
        if result is None:
            return None
        
        lamports = result.get("value", 0)
        sol_balance = lamports / 1_000_000_000  # Convert lamports to SOL
        
        return {
            "address": wallet_address,
            "lamports": lamports,
            "sol": sol_balance,
            "usd_value": None,  # Would need price oracle
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_token_balance(
        self,
        wallet_address: str,
        token_mint: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get SPL token balance for a wallet.
        
        Args:
            wallet_address: Wallet public key
            token_mint: Token mint address
            
        Returns:
            Token balance info
        """
        # Get token accounts by owner
        result = await self._rpc_call(
            "getTokenAccountsByOwner",
            [
                wallet_address,
                {"mint": token_mint},
                {"encoding": "jsonParsed"}
            ]
        )
        
        if result is None or not result.get("value"):
            return {
                "address": wallet_address,
                "mint": token_mint,
                "amount": 0,
                "decimals": self.TOKEN_DECIMALS.get(token_mint, 9),
                "uiAmount": 0.0,
                "tokenAccount": None
            }
        
        # Get the first token account
        token_account = result["value"][0]
        account_data = token_account["account"]["data"]["parsed"]["info"]
        token_amount = account_data.get("tokenAmount", {})
        
        return {
            "address": wallet_address,
            "mint": token_mint,
            "amount": int(token_amount.get("amount", 0)),
            "decimals": token_amount.get("decimals", 9),
            "uiAmount": float(token_amount.get("uiAmount", 0)),
            "tokenAccount": token_account["pubkey"]
        }
    
    async def get_all_token_balances(
        self,
        wallet_address: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get all token balances for a wallet.
        
        Args:
            wallet_address: Wallet public key
            
        Returns:
            All token balances including SOL
        """
        # Get SOL balance
        sol_balance = await self.get_sol_balance(wallet_address)
        
        # Get all token accounts
        result = await self._rpc_call(
            "getTokenAccountsByOwner",
            [
                wallet_address,
                {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
                {"encoding": "jsonParsed"}
            ]
        )
        
        tokens = []
        
        if result and result.get("value"):
            for token_account in result["value"]:
                try:
                    account_data = token_account["account"]["data"]["parsed"]["info"]
                    token_amount = account_data.get("tokenAmount", {})
                    mint = account_data.get("mint", "")
                    
                    # Only include tokens with non-zero balance
                    ui_amount = float(token_amount.get("uiAmount", 0))
                    if ui_amount > 0:
                        tokens.append({
                            "mint": mint,
                            "amount": int(token_amount.get("amount", 0)),
                            "decimals": token_amount.get("decimals", 9),
                            "uiAmount": ui_amount,
                            "tokenAccount": token_account["pubkey"]
                        })
                except Exception as e:
                    print(f"Error parsing token account: {e}")
                    continue
        
        return {
            "address": wallet_address,
            "sol": sol_balance,
            "tokens": tokens,
            "totalTokens": len(tokens),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_token_accounts(
        self,
        wallet_address: str
    ) -> List[Dict[str, Any]]:
        """
        Get all token accounts owned by a wallet.
        
        Args:
            wallet_address: Wallet public key
            
        Returns:
            List of token accounts with details
        """
        result = await self._rpc_call(
            "getTokenAccountsByOwner",
            [
                wallet_address,
                {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
                {"encoding": "jsonParsed"}
            ]
        )
        
        if not result or not result.get("value"):
            return []
        
        accounts = []
        for token_account in result["value"]:
            try:
                account_data = token_account["account"]["data"]["parsed"]["info"]
                token_amount = account_data.get("tokenAmount", {})
                
                accounts.append({
                    "pubkey": token_account["pubkey"],
                    "mint": account_data.get("mint", ""),
                    "owner": account_data.get("owner", ""),
                    "amount": int(token_amount.get("amount", 0)),
                    "decimals": token_amount.get("decimals", 9),
                    "uiAmount": float(token_amount.get("uiAmount", 0)),
                    "state": account_data.get("state", "initialized")
                })
            except Exception as e:
                print(f"Error parsing token account: {e}")
                continue
        
        return accounts
    
    async def get_recent_transactions(
        self,
        wallet_address: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent transactions for a wallet.
        
        Args:
            wallet_address: Wallet public key
            limit: Maximum number of transactions
            
        Returns:
            List of recent transaction signatures
        """
        result = await self._rpc_call(
            "getSignaturesForAddress",
            [wallet_address, {"limit": limit}]
        )
        
        if not result:
            return []
        
        transactions = []
        for tx in result:
            transactions.append({
                "signature": tx.get("signature"),
                "slot": tx.get("slot"),
                "blockTime": tx.get("blockTime"),
                "confirmationStatus": tx.get("confirmationStatus"),
                "err": tx.get("err"),
                "memo": tx.get("memo")
            })
        
        return transactions
    
    async def get_transaction(
        self,
        signature: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get transaction details by signature.
        
        Args:
            signature: Transaction signature
            
        Returns:
            Transaction details
        """
        result = await self._rpc_call(
            "getTransaction",
            [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}]
        )
        
        if not result:
            return None
        
        return {
            "signature": signature,
            "slot": result.get("slot"),
            "blockTime": result.get("blockTime"),
            "meta": result.get("meta"),
            "transaction": result.get("transaction")
        }
    
    async def check_wallet_health(self, wallet_address: str) -> Dict[str, Any]:
        """
        Check wallet health and status.
        
        Args:
            wallet_address: Wallet to check
            
        Returns:
            Health status info
        """
        sol_balance = await self.get_sol_balance(wallet_address)
        token_accounts = await self.get_token_accounts(wallet_address)
        
        # Check if wallet has enough SOL for transactions
        min_sol_for_tx = 0.01  # Minimum SOL needed for transactions
        has_enough_sol = (sol_balance and sol_balance.get("sol", 0) >= min_sol_for_tx)
        
        return {
            "address": wallet_address,
            "isValid": sol_balance is not None,
            "hasEnoughSol": has_enough_sol,
            "solBalance": sol_balance.get("sol", 0) if sol_balance else 0,
            "tokenAccountCount": len(token_accounts),
            "warnings": [] if has_enough_sol else ["Low SOL balance for transactions"],
            "rpcUrl": self.rpc_url,
            "network": "devnet" if "devnet" in self.rpc_url else "mainnet",
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def request_airdrop(
        self,
        wallet_address: str,
        amount_sol: float = 1.0
    ) -> Optional[Dict[str, Any]]:
        """
        Request SOL airdrop on devnet/testnet.
        
        Args:
            wallet_address: Wallet to receive airdrop
            amount_sol: Amount in SOL (max 2 on devnet)
            
        Returns:
            Airdrop result with signature
        """
        if "devnet" not in self.rpc_url and "testnet" not in self.rpc_url:
            return {
                "success": False,
                "error": "Airdrop only available on devnet/testnet"
            }
        
        # Limit airdrop amount
        amount_sol = min(amount_sol, 2.0)
        lamports = int(amount_sol * 1_000_000_000)
        
        result = await self._rpc_call(
            "requestAirdrop",
            [wallet_address, lamports]
        )
        
        if not result:
            return {
                "success": False,
                "error": "Airdrop request failed"
            }
        
        return {
            "success": True,
            "signature": result,
            "amount": amount_sol,
            "address": wallet_address
        }
    
    def connect_wallet(self, address: str, mode: str = "readonly") -> Dict[str, Any]:
        """
        Connect a wallet address (read-only mode).
        
        Args:
            address: Wallet public key
            mode: Connection mode (readonly, devnet)
            
        Returns:
            Connection status
        """
        self._connected_wallet = address
        self._wallet_mode = mode
        
        return {
            "connected": True,
            "address": address,
            "mode": mode,
            "message": "Wallet connected in read-only mode"
        }
    
    def disconnect_wallet(self) -> Dict[str, Any]:
        """Disconnect the current wallet."""
        address = self._connected_wallet
        self._connected_wallet = None
        self._wallet_mode = "readonly"
        
        return {
            "disconnected": True,
            "previousAddress": address
        }
    
    def get_connected_wallet(self) -> Optional[Dict[str, Any]]:
        """Get currently connected wallet info."""
        if not self._connected_wallet:
            return None
        
        return {
            "address": self._connected_wallet,
            "mode": self._wallet_mode,
            "isConnected": True
        }


# Global wallet service instance
wallet_service = WalletService()
