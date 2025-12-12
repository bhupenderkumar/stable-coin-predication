"""
Jupiter Swap Service - Complete Jupiter DEX Integration

Agent 4: Blockchain/Solana Specialist

This service handles:
- Swap quotes from Jupiter aggregator
- Swap transaction building
- Route optimization
- Price impact calculation
- Token list management
"""

import json
import base64
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.config import settings


class JupiterService:
    """
    Jupiter DEX Aggregator integration for Solana swaps.
    
    Jupiter provides the best swap routes across all Solana DEXs.
    """
    
    # Well-known Solana token addresses
    SOL_MINT = "So11111111111111111111111111111111111111112"
    USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    
    # Common meme coin addresses on Solana
    MEME_TOKENS = {
        "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        "WIF": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
        "POPCAT": "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
        "MYRO": "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
        "SAMO": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    }
    
    def __init__(self):
        self.base_url = settings.jupiter_api_url
        self.timeout = 30.0
    
    async def _api_call(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Optional[Dict[str, Any]]:
        """Make API call to Jupiter."""
        try:
            url = f"{self.base_url}{endpoint}"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method == "GET":
                    response = await client.get(url, params=params)
                else:
                    response = await client.post(url, json=data)
                
                if response.status_code != 200:
                    print(f"Jupiter API error: {response.status_code} - {response.text}")
                    return None
                
                return response.json()
        except Exception as e:
            print(f"Jupiter API call error: {e}")
            return None
    
    async def get_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 50,
        only_direct_routes: bool = False,
        as_legacy_transaction: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get swap quote from Jupiter.
        
        Args:
            input_mint: Input token mint address
            output_mint: Output token mint address
            amount: Amount in smallest unit (lamports/etc)
            slippage_bps: Slippage tolerance in basis points (50 = 0.5%)
            only_direct_routes: Only use direct routes (faster but potentially worse price)
            as_legacy_transaction: Use legacy transaction format
            
        Returns:
            Quote with expected output, price impact, and route info
        """
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": amount,
            "slippageBps": slippage_bps,
            "onlyDirectRoutes": only_direct_routes,
            "asLegacyTransaction": as_legacy_transaction
        }
        
        result = await self._api_call("GET", "/quote", params=params)
        
        if not result:
            return None
        
        # Parse and enhance quote data
        return {
            "inputMint": result.get("inputMint"),
            "outputMint": result.get("outputMint"),
            "inAmount": int(result.get("inAmount", 0)),
            "outAmount": int(result.get("outAmount", 0)),
            "otherAmountThreshold": result.get("otherAmountThreshold"),
            "swapMode": result.get("swapMode"),
            "slippageBps": result.get("slippageBps"),
            "priceImpactPct": float(result.get("priceImpactPct", 0)),
            "routePlan": result.get("routePlan", []),
            "contextSlot": result.get("contextSlot"),
            "timeTaken": result.get("timeTaken"),
            # Calculated fields
            "effectivePrice": self._calculate_effective_price(result),
            "routeCount": len(result.get("routePlan", [])),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    def _calculate_effective_price(self, quote: Dict) -> Optional[float]:
        """Calculate the effective price from quote."""
        try:
            in_amount = int(quote.get("inAmount", 0))
            out_amount = int(quote.get("outAmount", 0))
            if in_amount > 0 and out_amount > 0:
                return out_amount / in_amount
            return None
        except:
            return None
    
    async def get_swap_transaction(
        self,
        quote: Dict[str, Any],
        user_public_key: str,
        wrap_and_unwrap_sol: bool = True,
        fee_account: Optional[str] = None,
        compute_unit_price_micro_lamports: Optional[int] = None,
        prioritization_fee_lamports: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get swap transaction from Jupiter.
        
        Args:
            quote: Quote response from get_quote
            user_public_key: User's wallet public key
            wrap_and_unwrap_sol: Auto wrap/unwrap SOL
            fee_account: Platform fee account (optional)
            compute_unit_price_micro_lamports: Priority fee in micro lamports
            prioritization_fee_lamports: Auto-calculated priority fee
            
        Returns:
            Serialized transaction ready for signing
        """
        data = {
            "quoteResponse": quote,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": wrap_and_unwrap_sol,
            "dynamicComputeUnitLimit": True,
            "prioritizationFeeLamports": prioritization_fee_lamports or "auto"
        }
        
        if fee_account:
            data["feeAccount"] = fee_account
        
        if compute_unit_price_micro_lamports:
            data["computeUnitPriceMicroLamports"] = compute_unit_price_micro_lamports
        
        result = await self._api_call("POST", "/swap", data=data)
        
        if not result:
            return None
        
        return {
            "swapTransaction": result.get("swapTransaction"),
            "lastValidBlockHeight": result.get("lastValidBlockHeight"),
            "prioritizationFeeLamports": result.get("prioritizationFeeLamports"),
            "computeUnitLimit": result.get("computeUnitLimit"),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_swap_instructions(
        self,
        quote: Dict[str, Any],
        user_public_key: str,
        wrap_and_unwrap_sol: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Get swap instructions (instead of serialized transaction).
        Useful for composing with other instructions.
        
        Args:
            quote: Quote response
            user_public_key: User's wallet public key
            wrap_and_unwrap_sol: Auto wrap/unwrap SOL
            
        Returns:
            Swap instructions for composability
        """
        data = {
            "quoteResponse": quote,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": wrap_and_unwrap_sol
        }
        
        result = await self._api_call("POST", "/swap-instructions", data=data)
        
        if not result:
            return None
        
        return {
            "tokenLedgerInstruction": result.get("tokenLedgerInstruction"),
            "computeBudgetInstructions": result.get("computeBudgetInstructions"),
            "setupInstructions": result.get("setupInstructions"),
            "swapInstruction": result.get("swapInstruction"),
            "cleanupInstruction": result.get("cleanupInstruction"),
            "addressLookupTableAddresses": result.get("addressLookupTableAddresses"),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    async def get_token_list(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get list of tradeable tokens from Jupiter.
        
        Returns:
            List of tokens with their metadata
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Jupiter token list API
                response = await client.get(
                    "https://token.jup.ag/all",
                    headers={"Accept": "application/json"}
                )
                
                if response.status_code != 200:
                    return None
                
                tokens = response.json()
                
                # Return first 100 tokens for demo
                return tokens[:100] if len(tokens) > 100 else tokens
        except Exception as e:
            print(f"Token list error: {e}")
            return None
    
    async def get_indexed_route_map(self) -> Optional[Dict[str, Any]]:
        """
        Get indexed route map for all possible swaps.
        
        Returns:
            Route map with all possible swap pairs
        """
        return await self._api_call("GET", "/indexed-route-map")
    
    async def simulate_swap(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 50
    ) -> Dict[str, Any]:
        """
        Simulate a swap to get all relevant information.
        
        Args:
            input_mint: Input token
            output_mint: Output token
            amount: Amount in smallest unit
            slippage_bps: Slippage tolerance
            
        Returns:
            Complete swap simulation result
        """
        quote = await self.get_quote(
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount,
            slippage_bps=slippage_bps
        )
        
        if not quote:
            return {
                "success": False,
                "error": "Could not get quote",
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": amount
            }
        
        # Calculate human-readable values
        # Assuming 9 decimals for most Solana tokens
        input_decimals = 6 if input_mint == self.USDC_MINT else 9
        output_decimals = 6 if output_mint == self.USDC_MINT else 9
        
        ui_in_amount = quote["inAmount"] / (10 ** input_decimals)
        ui_out_amount = quote["outAmount"] / (10 ** output_decimals)
        
        return {
            "success": True,
            "quote": quote,
            "inputMint": input_mint,
            "outputMint": output_mint,
            "inAmount": quote["inAmount"],
            "outAmount": quote["outAmount"],
            "uiInAmount": ui_in_amount,
            "uiOutAmount": ui_out_amount,
            "priceImpactPct": quote["priceImpactPct"],
            "slippageBps": slippage_bps,
            "effectivePrice": quote.get("effectivePrice"),
            "routeCount": quote["routeCount"],
            "estimatedFeeUsd": self._estimate_fee_usd(quote),
            "warnings": self._get_swap_warnings(quote),
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }
    
    def _estimate_fee_usd(self, quote: Dict) -> float:
        """Estimate transaction fee in USD."""
        # Approximate SOL price (in production, get from oracle)
        sol_price_usd = 100
        # Estimate transaction fee (5000 lamports base + priority)
        estimated_lamports = 10000
        return (estimated_lamports / 1_000_000_000) * sol_price_usd
    
    def _get_swap_warnings(self, quote: Dict) -> List[str]:
        """Get warnings for the swap."""
        warnings = []
        
        price_impact = quote.get("priceImpactPct", 0)
        if price_impact > 5:
            warnings.append(f"High price impact: {price_impact:.2f}%")
        elif price_impact > 1:
            warnings.append(f"Moderate price impact: {price_impact:.2f}%")
        
        route_count = quote.get("routeCount", 0)
        if route_count > 3:
            warnings.append(f"Complex route with {route_count} hops")
        
        return warnings
    
    async def get_price(
        self,
        input_mint: str,
        output_mint: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get token price from Jupiter Price API.
        
        Args:
            input_mint: Token to get price for
            output_mint: Quote currency (default USDC)
            
        Returns:
            Price information
        """
        try:
            output = output_mint or self.USDC_MINT
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"https://price.jup.ag/v6/price",
                    params={"ids": input_mint, "vsToken": output}
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                price_data = data.get("data", {}).get(input_mint, {})
                
                return {
                    "mint": input_mint,
                    "vsToken": output,
                    "price": price_data.get("price"),
                    "mintSymbol": price_data.get("mintSymbol"),
                    "vsTokenSymbol": price_data.get("vsTokenSymbol"),
                    "confidence": price_data.get("confidence"),
                    "timestamp": int(datetime.utcnow().timestamp() * 1000)
                }
        except Exception as e:
            print(f"Price API error: {e}")
            return None
    
    async def get_multiple_prices(
        self,
        mints: List[str]
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Get prices for multiple tokens.
        
        Args:
            mints: List of token mints
            
        Returns:
            Dictionary of mint -> price info
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"https://price.jup.ag/v6/price",
                    params={"ids": ",".join(mints)}
                )
                
                if response.status_code != 200:
                    return {mint: None for mint in mints}
                
                data = response.json()
                result = {}
                
                for mint in mints:
                    price_data = data.get("data", {}).get(mint, {})
                    if price_data:
                        result[mint] = {
                            "mint": mint,
                            "price": price_data.get("price"),
                            "mintSymbol": price_data.get("mintSymbol"),
                            "confidence": price_data.get("confidence")
                        }
                    else:
                        result[mint] = None
                
                return result
        except Exception as e:
            print(f"Multiple prices error: {e}")
            return {mint: None for mint in mints}
    
    def get_token_address(self, symbol: str) -> Optional[str]:
        """Get token mint address by symbol."""
        symbol_upper = symbol.upper()
        
        # Check common tokens
        if symbol_upper == "SOL":
            return self.SOL_MINT
        elif symbol_upper == "USDC":
            return self.USDC_MINT
        elif symbol_upper == "USDT":
            return self.USDT_MINT
        elif symbol_upper in self.MEME_TOKENS:
            return self.MEME_TOKENS[symbol_upper]
        
        return None


# Global Jupiter service instance
jupiter_service = JupiterService()
