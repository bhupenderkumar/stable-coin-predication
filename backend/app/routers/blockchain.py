"""
Blockchain Router - Solana/Jupiter Integration Endpoints

Agent 4: Blockchain/Solana Specialist

This router provides endpoints for:
- Wallet management and balance checking
- Jupiter swap quotes and transactions
- Token account management
- Transaction simulation and sending
- Network health monitoring
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Path

from app.services.wallet import wallet_service
from app.services.jupiter import jupiter_service
from app.services.transaction import transaction_service
from app.schemas.blockchain import (
    # Wallet schemas
    WalletConnectRequest,
    WalletConnectResponse,
    WalletDisconnectResponse,
    SolBalanceResponse,
    TokenBalanceResponse,
    AllBalancesResponse,
    WalletHealthResponse,
    AirdropRequest,
    AirdropResponse,
    TokenAccountsResponse,
    RecentTransactionsResponse,
    # Transaction schemas
    TransactionStatusResponse,
    SimulateTransactionRequest,
    SimulateTransactionResponse,
    SendTransactionRequest,
    SendTransactionResponse,
    PriorityFeeResponse,
    BlockhashResponse,
    # Swap schemas
    SwapQuoteRequest,
    SwapQuoteResponse,
    SwapTransactionRequest,
    SwapTransactionResponse,
    SimulateSwapRequest,
    SimulateSwapResponse,
    TokenPriceResponse,
    MultiplePricesRequest,
    MultiplePricesResponse,
    TokenListResponse,
    TokenAddressResponse,
    # Network schemas
    NetworkHealthResponse,
)

router = APIRouter(prefix="/blockchain", tags=["blockchain"])


# ============== Wallet Endpoints ==============

@router.post("/wallet/connect", response_model=WalletConnectResponse)
async def connect_wallet(request: WalletConnectRequest):
    """
    Connect a wallet address (read-only mode).
    
    Note: This is read-only connection for balance checking.
    Transaction signing happens on the client side.
    """
    result = wallet_service.connect_wallet(request.address, request.mode)
    return result


@router.post("/wallet/disconnect", response_model=WalletDisconnectResponse)
async def disconnect_wallet():
    """Disconnect the currently connected wallet."""
    result = wallet_service.disconnect_wallet()
    return result


@router.get("/wallet/connected")
async def get_connected_wallet():
    """Get currently connected wallet info."""
    wallet = wallet_service.get_connected_wallet()
    if not wallet:
        return {"connected": False, "message": "No wallet connected"}
    return wallet


@router.get("/wallet/balance/sol/{address}", response_model=SolBalanceResponse)
async def get_sol_balance(address: str):
    """
    Get SOL balance for a wallet address.
    
    Args:
        address: Solana wallet public key (base58)
    """
    result = await wallet_service.get_sol_balance(address)
    
    if not result:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch balance for {address}"
        )
    
    return result


@router.get("/wallet/balance/token/{address}/{mint}", response_model=TokenBalanceResponse)
async def get_token_balance(address: str, mint: str):
    """
    Get SPL token balance for a wallet.
    
    Args:
        address: Wallet public key
        mint: Token mint address
    """
    result = await wallet_service.get_token_balance(address, mint)
    
    if not result:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch token balance"
        )
    
    return result


@router.get("/wallet/balances/{address}", response_model=AllBalancesResponse)
async def get_all_balances(address: str):
    """
    Get all token balances for a wallet (SOL + SPL tokens).
    
    Args:
        address: Wallet public key
    """
    result = await wallet_service.get_all_token_balances(address)
    
    if not result:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch balances for {address}"
        )
    
    return result


@router.get("/wallet/health/{address}", response_model=WalletHealthResponse)
async def check_wallet_health(address: str):
    """
    Check wallet health and status.
    
    Returns information about SOL balance, token accounts,
    and warnings about potential issues.
    """
    result = await wallet_service.check_wallet_health(address)
    return result


@router.get("/wallet/accounts/{address}", response_model=TokenAccountsResponse)
async def get_token_accounts(address: str):
    """
    Get all token accounts owned by a wallet.
    
    Args:
        address: Wallet public key
    """
    accounts = await wallet_service.get_token_accounts(address)
    
    return {
        "address": address,
        "accounts": accounts,
        "count": len(accounts),
        "timestamp": int(__import__("datetime").datetime.utcnow().timestamp() * 1000)
    }


@router.get("/wallet/transactions/{address}", response_model=RecentTransactionsResponse)
async def get_recent_transactions(
    address: str,
    limit: int = Query(default=10, ge=1, le=50)
):
    """
    Get recent transactions for a wallet.
    
    Args:
        address: Wallet public key
        limit: Maximum number of transactions (1-50)
    """
    transactions = await wallet_service.get_recent_transactions(address, limit)
    
    return {
        "address": address,
        "transactions": transactions,
        "count": len(transactions),
        "timestamp": int(__import__("datetime").datetime.utcnow().timestamp() * 1000)
    }


@router.post("/wallet/airdrop", response_model=AirdropResponse)
async def request_airdrop(request: AirdropRequest):
    """
    Request SOL airdrop on devnet/testnet.
    
    Only works on devnet/testnet. Max 2 SOL per request.
    """
    result = await wallet_service.request_airdrop(request.address, request.amount)
    
    if not result or not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error") if result else "Airdrop failed"
        )
    
    return result


# ============== Jupiter Swap Endpoints ==============

@router.post("/swap/quote", response_model=SwapQuoteResponse)
async def get_swap_quote(request: SwapQuoteRequest):
    """
    Get swap quote from Jupiter aggregator.
    
    Returns the best swap route with expected output,
    price impact, and route details.
    """
    quote = await jupiter_service.get_quote(
        input_mint=request.inputMint,
        output_mint=request.outputMint,
        amount=request.amount,
        slippage_bps=request.slippageBps,
        only_direct_routes=request.onlyDirectRoutes
    )
    
    if not quote:
        raise HTTPException(
            status_code=400,
            detail="Could not get quote from Jupiter"
        )
    
    return quote


@router.get("/swap/quote")
async def get_swap_quote_get(
    inputMint: str,
    outputMint: str,
    amount: int = Query(..., gt=0),
    slippageBps: int = Query(default=50, ge=1, le=1000),
    onlyDirectRoutes: bool = False
):
    """
    Get swap quote from Jupiter (GET version).
    
    Convenient for quick quotes without POST body.
    """
    quote = await jupiter_service.get_quote(
        input_mint=inputMint,
        output_mint=outputMint,
        amount=amount,
        slippage_bps=slippageBps,
        only_direct_routes=onlyDirectRoutes
    )
    
    if not quote:
        raise HTTPException(
            status_code=400,
            detail="Could not get quote from Jupiter"
        )
    
    return quote


@router.post("/swap/transaction", response_model=SwapTransactionResponse)
async def get_swap_transaction(request: SwapTransactionRequest):
    """
    Get swap transaction from Jupiter.
    
    Returns a serialized transaction ready for signing.
    The transaction should be signed on the client side.
    """
    result = await jupiter_service.get_swap_transaction(
        quote=request.quote,
        user_public_key=request.userPublicKey,
        wrap_and_unwrap_sol=request.wrapAndUnwrapSol,
        prioritization_fee_lamports=request.prioritizationFeeLamports
    )
    
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Could not get swap transaction"
        )
    
    return result


@router.post("/swap/simulate", response_model=SimulateSwapResponse)
async def simulate_swap(request: SimulateSwapRequest):
    """
    Simulate a swap to get all relevant information.
    
    Returns quote, expected output, price impact,
    and any warnings about the swap.
    """
    result = await jupiter_service.simulate_swap(
        input_mint=request.inputMint,
        output_mint=request.outputMint,
        amount=request.amount,
        slippage_bps=request.slippageBps
    )
    
    return result


@router.get("/swap/price/{mint}", response_model=TokenPriceResponse)
async def get_token_price(
    mint: str,
    vsToken: Optional[str] = None
):
    """
    Get token price from Jupiter Price API.
    
    Args:
        mint: Token mint address
        vsToken: Quote currency (default USDC)
    """
    result = await jupiter_service.get_price(mint, vsToken)
    
    if not result:
        raise HTTPException(
            status_code=400,
            detail=f"Could not get price for {mint}"
        )
    
    return result


@router.post("/swap/prices", response_model=MultiplePricesResponse)
async def get_multiple_prices(request: MultiplePricesRequest):
    """
    Get prices for multiple tokens.
    
    More efficient than multiple single price requests.
    """
    prices = await jupiter_service.get_multiple_prices(request.mints)
    
    return {
        "prices": prices,
        "timestamp": int(__import__("datetime").datetime.utcnow().timestamp() * 1000)
    }


@router.get("/swap/token-address/{symbol}", response_model=TokenAddressResponse)
async def get_token_address(symbol: str):
    """
    Get token mint address by symbol.
    
    Supports common tokens like SOL, USDC, USDT,
    and popular meme coins (BONK, WIF, POPCAT, etc.)
    """
    address = jupiter_service.get_token_address(symbol)
    
    return {
        "symbol": symbol.upper(),
        "address": address,
        "found": address is not None
    }


@router.get("/tokens", response_model=TokenListResponse)
async def get_token_list():
    """
    Get list of tradeable tokens from Jupiter.
    
    Returns first 100 tokens for demo purposes.
    """
    tokens = await jupiter_service.get_token_list()
    
    if not tokens:
        return {
            "tokens": [],
            "count": 0,
            "timestamp": int(__import__("datetime").datetime.utcnow().timestamp() * 1000)
        }
    
    return {
        "tokens": tokens,
        "count": len(tokens),
        "timestamp": int(__import__("datetime").datetime.utcnow().timestamp() * 1000)
    }


# ============== Transaction Endpoints ==============

@router.post("/transaction/simulate", response_model=SimulateTransactionResponse)
async def simulate_transaction(request: SimulateTransactionRequest):
    """
    Simulate a transaction before sending.
    
    Returns simulation logs and any potential errors.
    Use this to verify transaction will succeed.
    """
    result = await transaction_service.simulate_transaction(
        transaction_base64=request.transaction,
        sig_verify=request.sigVerify,
        replace_recent_blockhash=request.replaceRecentBlockhash
    )
    
    return result


@router.post("/transaction/send", response_model=SendTransactionResponse)
async def send_transaction(request: SendTransactionRequest):
    """
    Send a signed transaction to the network.
    
    The transaction must be signed before calling this endpoint.
    Returns transaction signature on success.
    """
    result = await transaction_service.send_transaction(
        transaction_base64=request.transaction,
        skip_preflight=request.skipPreflight,
        max_retries=request.maxRetries
    )
    
    return result


@router.get("/transaction/status/{signature}", response_model=TransactionStatusResponse)
async def get_transaction_status(signature: str):
    """
    Get transaction status and confirmation.
    
    Args:
        signature: Transaction signature
    """
    result = await transaction_service.get_transaction_status(signature)
    return result


@router.get("/transaction/wait/{signature}")
async def wait_for_confirmation(
    signature: str,
    maxAttempts: int = Query(default=30, ge=1, le=60),
    delayMs: int = Query(default=1000, ge=500, le=5000)
):
    """
    Wait for transaction confirmation.
    
    Polls until transaction is finalized or timeout.
    """
    result = await transaction_service.wait_for_confirmation(
        signature=signature,
        max_attempts=maxAttempts,
        delay_ms=delayMs
    )
    return result


@router.get("/transaction/details/{signature}")
async def get_transaction_details(signature: str):
    """
    Get full transaction details.
    
    Args:
        signature: Transaction signature
    """
    result = await wallet_service.get_transaction(signature)
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Transaction not found: {signature}"
        )
    
    return result


# ============== Network Endpoints ==============

@router.get("/network/blockhash", response_model=BlockhashResponse)
async def get_recent_blockhash():
    """
    Get recent blockhash for transaction building.
    
    Returns blockhash and last valid block height.
    """
    result = await transaction_service.get_recent_blockhash()
    
    if not result:
        raise HTTPException(
            status_code=500,
            detail="Could not get recent blockhash"
        )
    
    return result


@router.get("/network/priority-fee", response_model=PriorityFeeResponse)
async def get_priority_fee(
    accounts: Optional[str] = Query(
        default=None,
        description="Comma-separated list of account addresses"
    )
):
    """
    Get recommended priority fees.
    
    Returns min, low, medium, high, and recommended fee levels.
    """
    account_list = accounts.split(",") if accounts else None
    result = await transaction_service.get_priority_fee(account_list)
    return result


@router.get("/network/health", response_model=NetworkHealthResponse)
async def get_network_health():
    """
    Check Solana network/RPC health.
    
    Returns current slot, block height, and connection status.
    """
    result = await transaction_service.get_health()
    return result


@router.get("/network/slot")
async def get_current_slot():
    """Get current Solana slot."""
    slot = await transaction_service.get_slot()
    
    if slot is None:
        raise HTTPException(status_code=500, detail="Could not get slot")
    
    return {"slot": slot}


@router.get("/network/block-height")
async def get_block_height():
    """Get current Solana block height."""
    height = await transaction_service.get_block_height()
    
    if height is None:
        raise HTTPException(status_code=500, detail="Could not get block height")
    
    return {"blockHeight": height}


# ============== Utility Endpoints ==============

@router.get("/rent-exemption/{dataSize}")
async def get_rent_exemption(dataSize: int = Path(..., ge=0, le=10000000)):
    """
    Get minimum balance for rent exemption.
    
    Args:
        dataSize: Size of account data in bytes
    """
    balance = await transaction_service.get_minimum_balance_for_rent(dataSize)
    
    if balance is None:
        raise HTTPException(
            status_code=500,
            detail="Could not calculate rent exemption"
        )
    
    return {
        "dataSize": dataSize,
        "minimumBalance": balance,
        "minimumBalanceSol": balance / 1_000_000_000
    }


@router.get("/constants")
async def get_blockchain_constants():
    """
    Get common blockchain constants and addresses.
    
    Returns well-known token addresses and useful constants.
    """
    return {
        "tokens": {
            "SOL": wallet_service.SOL_MINT,
            "USDC": wallet_service.USDC_MINT,
            "USDT": wallet_service.USDT_MINT,
        },
        "memeTokens": jupiter_service.MEME_TOKENS,
        "decimals": {
            "SOL": 9,
            "USDC": 6,
            "USDT": 6,
        },
        "networks": {
            "devnet": "https://api.devnet.solana.com",
            "mainnet": "https://api.mainnet-beta.solana.com",
        },
        "apis": {
            "jupiter": "https://quote-api.jup.ag/v6",
            "jupiterPrice": "https://price.jup.ag/v6",
        }
    }
