"""
Blockchain-related Pydantic schemas for API request/response validation.

Agent 4: Blockchain/Solana Specialist
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============== Wallet Schemas ==============

class WalletConnectRequest(BaseModel):
    """Request to connect a wallet."""
    address: str = Field(..., description="Solana wallet public key (base58)")
    mode: str = Field(default="readonly", pattern="^(readonly|devnet)$")


class WalletConnectResponse(BaseModel):
    """Response for wallet connection."""
    connected: bool
    address: str
    mode: str
    message: str


class WalletDisconnectResponse(BaseModel):
    """Response for wallet disconnection."""
    disconnected: bool
    previousAddress: Optional[str] = None


class WalletBalanceRequest(BaseModel):
    """Request for wallet balance."""
    address: str


class SolBalanceResponse(BaseModel):
    """SOL balance response."""
    address: str
    lamports: int
    sol: float
    usd_value: Optional[float] = None
    timestamp: int


class TokenBalanceResponse(BaseModel):
    """Token balance response."""
    address: str
    mint: str
    amount: int
    decimals: int
    uiAmount: float
    tokenAccount: Optional[str] = None


class AllBalancesResponse(BaseModel):
    """All balances response."""
    address: str
    sol: Optional[SolBalanceResponse] = None
    tokens: List[Dict[str, Any]]
    totalTokens: int
    timestamp: int


class WalletHealthResponse(BaseModel):
    """Wallet health check response."""
    address: str
    isValid: bool
    hasEnoughSol: bool
    solBalance: float
    tokenAccountCount: int
    warnings: List[str]
    rpcUrl: str
    network: str
    timestamp: int


class AirdropRequest(BaseModel):
    """Airdrop request (devnet only)."""
    address: str
    amount: float = Field(default=1.0, ge=0.1, le=2.0)


class AirdropResponse(BaseModel):
    """Airdrop response."""
    success: bool
    signature: Optional[str] = None
    amount: Optional[float] = None
    address: Optional[str] = None
    error: Optional[str] = None


# ============== Token Account Schemas ==============

class TokenAccountInfo(BaseModel):
    """Token account information."""
    pubkey: str
    mint: str
    owner: str
    amount: int
    decimals: int
    uiAmount: float
    state: str


class TokenAccountsResponse(BaseModel):
    """Token accounts list response."""
    address: str
    accounts: List[TokenAccountInfo]
    count: int
    timestamp: int


# ============== Transaction Schemas ==============

class TransactionInfo(BaseModel):
    """Basic transaction information."""
    signature: str
    slot: Optional[int] = None
    blockTime: Optional[int] = None
    confirmationStatus: Optional[str] = None
    err: Optional[Any] = None
    memo: Optional[str] = None


class RecentTransactionsResponse(BaseModel):
    """Recent transactions response."""
    address: str
    transactions: List[TransactionInfo]
    count: int
    timestamp: int


class TransactionStatusRequest(BaseModel):
    """Transaction status request."""
    signature: str


class TransactionStatusResponse(BaseModel):
    """Transaction status response."""
    signature: str
    found: bool
    slot: Optional[int] = None
    confirmations: Optional[int] = None
    confirmationStatus: Optional[str] = None
    err: Optional[Any] = None
    status: str
    isError: bool = False
    timestamp: int


class SimulateTransactionRequest(BaseModel):
    """Transaction simulation request."""
    transaction: str = Field(..., description="Base64 encoded transaction")
    sigVerify: bool = False
    replaceRecentBlockhash: bool = True


class SimulateTransactionResponse(BaseModel):
    """Transaction simulation response."""
    success: bool
    error: Optional[Any] = None
    logs: List[str] = []
    unitsConsumed: Optional[int] = None
    returnData: Optional[Any] = None
    timestamp: int


class SendTransactionRequest(BaseModel):
    """Send transaction request."""
    transaction: str = Field(..., description="Base64 encoded signed transaction")
    skipPreflight: bool = False
    maxRetries: int = Field(default=3, ge=1, le=10)


class SendTransactionResponse(BaseModel):
    """Send transaction response."""
    success: bool
    signature: Optional[str] = None
    error: Optional[Any] = None
    timestamp: int


class PriorityFeeResponse(BaseModel):
    """Priority fee response."""
    min: int
    low: int
    medium: int
    high: int
    recommended: int
    source: str
    sampleSize: Optional[int] = None
    timestamp: int


class BlockhashResponse(BaseModel):
    """Recent blockhash response."""
    blockhash: str
    lastValidBlockHeight: int
    timestamp: int


# ============== Jupiter/Swap Schemas ==============

class SwapQuoteRequest(BaseModel):
    """Swap quote request."""
    inputMint: str
    outputMint: str
    amount: int = Field(..., gt=0)
    slippageBps: int = Field(default=50, ge=1, le=1000)
    onlyDirectRoutes: bool = False


class RoutePlanStep(BaseModel):
    """Single step in a swap route."""
    swapInfo: Dict[str, Any]
    percent: int


class SwapQuoteResponse(BaseModel):
    """Swap quote response."""
    inputMint: str
    outputMint: str
    inAmount: int
    outAmount: int
    otherAmountThreshold: Optional[str] = None
    swapMode: Optional[str] = None
    slippageBps: Optional[int] = None
    priceImpactPct: float
    routePlan: List[Dict[str, Any]] = []
    effectivePrice: Optional[float] = None
    routeCount: int
    timestamp: int


class SwapTransactionRequest(BaseModel):
    """Swap transaction request."""
    quote: Dict[str, Any]
    userPublicKey: str
    wrapAndUnwrapSol: bool = True
    prioritizationFeeLamports: Optional[int] = None


class SwapTransactionResponse(BaseModel):
    """Swap transaction response."""
    swapTransaction: str
    lastValidBlockHeight: Optional[int] = None
    prioritizationFeeLamports: Optional[int] = None
    computeUnitLimit: Optional[int] = None
    timestamp: int


class SimulateSwapRequest(BaseModel):
    """Simulate swap request."""
    inputMint: str
    outputMint: str
    amount: int = Field(..., gt=0)
    slippageBps: int = Field(default=50, ge=1, le=1000)


class SimulateSwapResponse(BaseModel):
    """Simulate swap response."""
    success: bool
    error: Optional[str] = None
    quote: Optional[Dict[str, Any]] = None
    inputMint: str
    outputMint: str
    inAmount: Optional[int] = None
    outAmount: Optional[int] = None
    uiInAmount: Optional[float] = None
    uiOutAmount: Optional[float] = None
    priceImpactPct: Optional[float] = None
    slippageBps: int
    effectivePrice: Optional[float] = None
    routeCount: Optional[int] = None
    estimatedFeeUsd: Optional[float] = None
    warnings: List[str] = []
    timestamp: int


class TokenPriceRequest(BaseModel):
    """Token price request."""
    mint: str
    vsToken: Optional[str] = None


class TokenPriceResponse(BaseModel):
    """Token price response."""
    mint: str
    vsToken: Optional[str] = None
    price: Optional[float] = None
    mintSymbol: Optional[str] = None
    vsTokenSymbol: Optional[str] = None
    confidence: Optional[str] = None
    timestamp: int


class MultiplePricesRequest(BaseModel):
    """Multiple token prices request."""
    mints: List[str]


class MultiplePricesResponse(BaseModel):
    """Multiple token prices response."""
    prices: Dict[str, Optional[TokenPriceResponse]]
    timestamp: int


# ============== Network Health Schemas ==============

class NetworkHealthResponse(BaseModel):
    """Network health response."""
    healthy: bool
    rpcUrl: str
    slot: Optional[int] = None
    blockHeight: Optional[int] = None
    blockhash: Optional[str] = None
    network: str
    error: Optional[str] = None
    timestamp: int


# ============== Token Info Schemas ==============

class TokenInfo(BaseModel):
    """Token information from Jupiter."""
    address: str
    chainId: Optional[int] = None
    decimals: int
    name: str
    symbol: str
    logoURI: Optional[str] = None
    tags: List[str] = []
    extensions: Optional[Dict[str, Any]] = None


class TokenListResponse(BaseModel):
    """Token list response."""
    tokens: List[TokenInfo]
    count: int
    timestamp: int


class TokenAddressRequest(BaseModel):
    """Get token address by symbol."""
    symbol: str


class TokenAddressResponse(BaseModel):
    """Token address response."""
    symbol: str
    address: Optional[str] = None
    found: bool
