"""
Transaction Service - Solana Transaction Building & Management

Agent 4: Blockchain/Solana Specialist

This service handles:
- Transaction building
- Transaction simulation
- Transaction status tracking
- Fee estimation
- Priority fee management
"""

import base64
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.config import settings


class TransactionService:
    """
    Solana transaction service for building and managing transactions.
    
    Note: This service focuses on transaction preparation and simulation.
    Actual signing should happen on the client side for security.
    """
    
    def __init__(self):
        self.rpc_url = settings.solana_rpc_url
        self.timeout = 30.0
    
    async def _rpc_call(self, method: str, params: List[Any]) -> Optional[Dict[str, Any]]:
        """Make a JSON-RPC call to Solana."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
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
                    return {"error": data["error"]}
                
                return data.get("result")
        except Exception as e:
            print(f"RPC call error: {e}")
            return {"error": str(e)}
    
    async def simulate_transaction(
        self,
        transaction_base64: str,
        sig_verify: bool = False,
        replace_recent_blockhash: bool = True
    ) -> Dict[str, Any]:
        """
        Simulate a transaction before sending.
        
        Args:
            transaction_base64: Base64 encoded transaction
            sig_verify: Verify signatures (skip for unsigned)
            replace_recent_blockhash: Replace with recent blockhash
            
        Returns:
            Simulation result with logs and potential errors
        """
        config = {
            "encoding": "base64",
            "sigVerify": sig_verify,
            "replaceRecentBlockhash": replace_recent_blockhash,
            "commitment": "confirmed"
        }
        
        result = await self._rpc_call(
            "simulateTransaction",
            [transaction_base64, config]
        )
        
        if not result or "error" in result:
            return {
                "success": False,
                "error": result.get("error") if result else "Simulation failed",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        value = result.get("value", {})
        
        return {
            "success": value.get("err") is None,
            "error": value.get("err"),
            "logs": value.get("logs", []),
            "unitsConsumed": value.get("unitsConsumed"),
            "returnData": value.get("returnData"),
            "accounts": value.get("accounts"),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def send_transaction(
        self,
        transaction_base64: str,
        skip_preflight: bool = False,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Send a signed transaction to the network.
        
        Args:
            transaction_base64: Base64 encoded signed transaction
            skip_preflight: Skip preflight simulation
            max_retries: Max retry attempts
            
        Returns:
            Transaction signature or error
        """
        config = {
            "encoding": "base64",
            "skipPreflight": skip_preflight,
            "preflightCommitment": "confirmed",
            "maxRetries": max_retries
        }
        
        result = await self._rpc_call(
            "sendTransaction",
            [transaction_base64, config]
        )
        
        if not result or "error" in result:
            return {
                "success": False,
                "error": result.get("error") if result else "Send failed",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        return {
            "success": True,
            "signature": result,
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_transaction_status(
        self,
        signature: str
    ) -> Dict[str, Any]:
        """
        Get transaction status and confirmation.
        
        Args:
            signature: Transaction signature
            
        Returns:
            Transaction status info
        """
        # Get signature status
        result = await self._rpc_call(
            "getSignatureStatuses",
            [[signature], {"searchTransactionHistory": True}]
        )
        
        if not result or "error" in result:
            return {
                "signature": signature,
                "found": False,
                "error": result.get("error") if result else "Status check failed",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        value = result.get("value", [])
        
        if not value or value[0] is None:
            return {
                "signature": signature,
                "found": False,
                "status": "not_found",
                "message": "Transaction not found. It may still be processing.",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        status_info = value[0]
        
        return {
            "signature": signature,
            "found": True,
            "slot": status_info.get("slot"),
            "confirmations": status_info.get("confirmations"),
            "confirmationStatus": status_info.get("confirmationStatus"),
            "err": status_info.get("err"),
            "status": "confirmed" if status_info.get("confirmationStatus") else "pending",
            "isError": status_info.get("err") is not None,
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def wait_for_confirmation(
        self,
        signature: str,
        max_attempts: int = 30,
        delay_ms: int = 1000
    ) -> Dict[str, Any]:
        """
        Wait for transaction confirmation.
        
        Args:
            signature: Transaction signature
            max_attempts: Max polling attempts
            delay_ms: Delay between attempts in ms
            
        Returns:
            Final confirmation status
        """
        import asyncio
        
        for attempt in range(max_attempts):
            status = await self.get_transaction_status(signature)
            
            if status.get("found") and status.get("confirmationStatus") == "finalized":
                return {
                    **status,
                    "confirmed": True,
                    "attempts": attempt + 1
                }
            
            if status.get("isError"):
                return {
                    **status,
                    "confirmed": False,
                    "attempts": attempt + 1
                }
            
            await asyncio.sleep(delay_ms / 1000)
        
        return {
            "signature": signature,
            "confirmed": False,
            "timeout": True,
            "attempts": max_attempts,
            "message": "Transaction confirmation timed out",
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_recent_blockhash(self) -> Optional[Dict[str, Any]]:
        """
        Get recent blockhash for transaction building.
        
        Returns:
            Recent blockhash and last valid block height
        """
        result = await self._rpc_call(
            "getLatestBlockhash",
            [{"commitment": "finalized"}]
        )
        
        if not result or "error" in result:
            return None
        
        value = result.get("value", {})
        
        return {
            "blockhash": value.get("blockhash"),
            "lastValidBlockHeight": value.get("lastValidBlockHeight"),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_priority_fee(
        self,
        account_keys: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get recommended priority fee.
        
        Args:
            account_keys: Accounts to check fees for
            
        Returns:
            Priority fee recommendations
        """
        params = []
        if account_keys:
            params.append({"lockedWritableAccounts": account_keys})
        
        result = await self._rpc_call("getRecentPrioritizationFees", params)
        
        if not result or "error" in result:
            # Return default recommendations
            return {
                "min": 1000,
                "low": 10000,
                "medium": 100000,
                "high": 1000000,
                "recommended": 50000,
                "source": "default",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        # Calculate fee statistics
        fees = [f.get("prioritizationFee", 0) for f in result if f.get("prioritizationFee")]
        
        if not fees:
            return {
                "min": 1000,
                "low": 10000,
                "medium": 100000,
                "high": 1000000,
                "recommended": 50000,
                "source": "default",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        fees_sorted = sorted(fees)
        
        return {
            "min": fees_sorted[0] if fees_sorted else 1000,
            "low": fees_sorted[len(fees_sorted) // 4] if fees_sorted else 10000,
            "medium": fees_sorted[len(fees_sorted) // 2] if fees_sorted else 100000,
            "high": fees_sorted[int(len(fees_sorted) * 0.9)] if fees_sorted else 1000000,
            "recommended": fees_sorted[len(fees_sorted) // 2] if fees_sorted else 50000,
            "source": "network",
            "sampleSize": len(fees),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def estimate_transaction_fee(
        self,
        transaction_base64: Optional[str] = None,
        message_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Estimate transaction fee.
        
        Args:
            transaction_base64: Full transaction (base64)
            message_base64: Just the message (base64)
            
        Returns:
            Fee estimation in lamports
        """
        if message_base64:
            result = await self._rpc_call(
                "getFeeForMessage",
                [message_base64, {"commitment": "confirmed"}]
            )
        else:
            # Use default estimation
            return {
                "fee": 5000,  # Base fee
                "priorityFee": 0,
                "totalFee": 5000,
                "source": "estimate",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        if not result or "error" in result:
            return {
                "fee": 5000,
                "priorityFee": 0,
                "totalFee": 5000,
                "source": "default",
                "error": result.get("error") if result else None,
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        
        fee = result.get("value", 5000)
        
        return {
            "fee": fee,
            "priorityFee": 0,
            "totalFee": fee,
            "source": "calculated",
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_minimum_balance_for_rent(
        self,
        data_size: int
    ) -> Optional[int]:
        """
        Get minimum balance for rent exemption.
        
        Args:
            data_size: Size of account data in bytes
            
        Returns:
            Minimum balance in lamports
        """
        result = await self._rpc_call(
            "getMinimumBalanceForRentExemption",
            [data_size]
        )
        
        if not result or "error" in result:
            return None
        
        return result
    
    async def get_slot(self) -> Optional[int]:
        """Get current slot."""
        result = await self._rpc_call("getSlot", [])
        if result is None:
            return None
        if isinstance(result, dict) and "error" in result:
            return None
        return result if isinstance(result, int) else None
    
    async def get_block_height(self) -> Optional[int]:
        """Get current block height."""
        result = await self._rpc_call("getBlockHeight", [])
        if result is None:
            return None
        if isinstance(result, dict) and "error" in result:
            return None
        return result if isinstance(result, int) else None
    
    async def get_health(self) -> Dict[str, Any]:
        """
        Check RPC node health.
        
        Returns:
            Health status of the Solana RPC
        """
        try:
            slot = await self.get_slot()
            block_height = await self.get_block_height()
            blockhash = await self.get_recent_blockhash()
            
            return {
                "healthy": slot is not None,
                "rpcUrl": self.rpc_url,
                "slot": slot,
                "blockHeight": block_height,
                "blockhash": blockhash.get("blockhash") if blockhash else None,
                "network": "devnet" if "devnet" in self.rpc_url else "mainnet",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "rpcUrl": self.rpc_url,
                "network": "devnet" if "devnet" in self.rpc_url else "mainnet",
                "timestamp": int(datetime.utcnow().timestamp() * 1000)
            }


# Global transaction service instance
transaction_service = TransactionService()
