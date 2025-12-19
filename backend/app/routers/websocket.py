"""
WebSocket Router - Real-time Price Updates

Provides WebSocket endpoints for:
- Real-time price streaming
- Trade notifications
- Analysis updates
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from dataclasses import dataclass, asdict
import random

router = APIRouter(tags=["websocket"])


@dataclass
class PriceUpdate:
    """Price update message structure"""
    symbol: str
    price: float
    change24h: float
    volume24h: float
    timestamp: int


@dataclass
class WSMessage:
    """WebSocket message wrapper"""
    type: str
    payload: dict
    timestamp: int


class ConnectionManager:
    """Manages WebSocket connections and subscriptions"""
    
    def __init__(self):
        # Map of connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Map of connection_id -> Set of subscribed symbols
        self.subscriptions: Dict[str, Set[str]] = {}
        # Map of symbol -> Set of connection_ids
        self.symbol_subscribers: Dict[str, Set[str]] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, connection_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        async with self._lock:
            self.active_connections[connection_id] = websocket
            self.subscriptions[connection_id] = set()
    
    async def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection"""
        async with self._lock:
            # Remove from active connections
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]
            
            # Remove subscriptions
            if connection_id in self.subscriptions:
                for symbol in self.subscriptions[connection_id]:
                    if symbol in self.symbol_subscribers:
                        self.symbol_subscribers[symbol].discard(connection_id)
                del self.subscriptions[connection_id]
    
    async def subscribe(self, connection_id: str, symbol: str):
        """Subscribe a connection to a symbol"""
        async with self._lock:
            if connection_id in self.subscriptions:
                self.subscriptions[connection_id].add(symbol)
                
                if symbol not in self.symbol_subscribers:
                    self.symbol_subscribers[symbol] = set()
                self.symbol_subscribers[symbol].add(connection_id)
    
    async def unsubscribe(self, connection_id: str, symbol: str):
        """Unsubscribe a connection from a symbol"""
        async with self._lock:
            if connection_id in self.subscriptions:
                self.subscriptions[connection_id].discard(symbol)
                
            if symbol in self.symbol_subscribers:
                self.symbol_subscribers[symbol].discard(connection_id)
    
    async def send_personal_message(self, message: dict, connection_id: str):
        """Send a message to a specific connection"""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception:
                await self.disconnect(connection_id)
    
    async def broadcast_to_symbol(self, symbol: str, message: dict):
        """Broadcast a message to all subscribers of a symbol"""
        if symbol not in self.symbol_subscribers:
            return
            
        disconnected = []
        for connection_id in self.symbol_subscribers[symbol]:
            if connection_id in self.active_connections:
                try:
                    await self.active_connections[connection_id].send_json(message)
                except Exception:
                    disconnected.append(connection_id)
        
        # Clean up disconnected clients
        for connection_id in disconnected:
            await self.disconnect(connection_id)
    
    async def broadcast_all(self, message: dict):
        """Broadcast a message to all connected clients"""
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(connection_id)
        
        # Clean up disconnected clients
        for connection_id in disconnected:
            await self.disconnect(connection_id)
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
    
    def get_subscriptions(self, connection_id: str) -> Set[str]:
        """Get symbols a connection is subscribed to"""
        return self.subscriptions.get(connection_id, set())


# Global connection manager
manager = ConnectionManager()


# Mock price data for simulation
MOCK_PRICES = {
    "BONK": {"price": 0.00002341, "change24h": 5.67, "volume24h": 45000000},
    "WIF": {"price": 2.45, "change24h": -3.21, "volume24h": 120000000},
    "POPCAT": {"price": 0.89, "change24h": 15.43, "volume24h": 35000000},
    "MYRO": {"price": 0.12, "change24h": 8.90, "volume24h": 18000000},
    "SAMO": {"price": 0.0089, "change24h": -2.15, "volume24h": 5600000},
    "MEW": {"price": 0.0067, "change24h": 12.34, "volume24h": 28000000},
    "BOME": {"price": 0.0098, "change24h": -7.65, "volume24h": 42000000},
    "SLERF": {"price": 0.34, "change24h": -15.67, "volume24h": 8900000},
}


def generate_price_update(symbol: str) -> PriceUpdate:
    """Generate a simulated price update"""
    if symbol in MOCK_PRICES:
        base = MOCK_PRICES[symbol]
        # Add some random fluctuation
        price_change = random.uniform(-0.02, 0.02)  # ±2%
        new_price = base["price"] * (1 + price_change)
        new_change = base["change24h"] + random.uniform(-0.5, 0.5)
        new_volume = base["volume24h"] * random.uniform(0.95, 1.05)
        
        return PriceUpdate(
            symbol=symbol,
            price=new_price,
            change24h=new_change,
            volume24h=new_volume,
            timestamp=int(datetime.utcnow().timestamp() * 1000)
        )
    
    # Default for unknown symbols
    return PriceUpdate(
        symbol=symbol,
        price=random.uniform(0.01, 10),
        change24h=random.uniform(-10, 10),
        volume24h=random.uniform(1000000, 50000000),
        timestamp=int(datetime.utcnow().timestamp() * 1000)
    )


async def price_update_task(symbol: str, interval: float = 2.0):
    """Background task to send price updates for a symbol"""
    while True:
        if symbol not in manager.symbol_subscribers or len(manager.symbol_subscribers[symbol]) == 0:
            break
            
        update = generate_price_update(symbol)
        message = WSMessage(
            type="price_update",
            payload=asdict(update),
            timestamp=int(datetime.utcnow().timestamp() * 1000)
        )
        
        await manager.broadcast_to_symbol(symbol, asdict(message))
        await asyncio.sleep(interval)


# Track running price update tasks
price_tasks: Dict[str, asyncio.Task] = {}


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    """
    WebSocket endpoint for real-time price updates.
    
    Messages:
    - Subscribe: {"type": "subscribe", "symbol": "BONK"}
    - Unsubscribe: {"type": "unsubscribe", "symbol": "BONK"}
    
    Responses:
    - Price update: {"type": "price_update", "payload": {...}, "timestamp": ...}
    - Error: {"type": "error", "message": "...", "timestamp": ...}
    """
    connection_id = str(id(websocket))
    await manager.connect(websocket, connection_id)
    
    try:
        # Send welcome message
        welcome = WSMessage(
            type="connected",
            payload={"message": "Connected to price stream", "connection_id": connection_id},
            timestamp=int(datetime.utcnow().timestamp() * 1000)
        )
        await websocket.send_json(asdict(welcome))
        
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()
            
            msg_type = data.get("type")
            symbol = data.get("symbol", "").upper()
            
            if msg_type == "subscribe" and symbol:
                await manager.subscribe(connection_id, symbol)
                
                # Start price update task if not running
                if symbol not in price_tasks or price_tasks[symbol].done():
                    price_tasks[symbol] = asyncio.create_task(price_update_task(symbol))
                
                # Confirm subscription
                confirm = WSMessage(
                    type="subscribed",
                    payload={"symbol": symbol, "subscriptions": list(manager.get_subscriptions(connection_id))},
                    timestamp=int(datetime.utcnow().timestamp() * 1000)
                )
                await websocket.send_json(asdict(confirm))
                
            elif msg_type == "unsubscribe" and symbol:
                await manager.unsubscribe(connection_id, symbol)
                
                # Confirm unsubscription
                confirm = WSMessage(
                    type="unsubscribed",
                    payload={"symbol": symbol, "subscriptions": list(manager.get_subscriptions(connection_id))},
                    timestamp=int(datetime.utcnow().timestamp() * 1000)
                )
                await websocket.send_json(asdict(confirm))
                
            elif msg_type == "ping":
                # Respond to ping
                pong = WSMessage(
                    type="pong",
                    payload={},
                    timestamp=int(datetime.utcnow().timestamp() * 1000)
                )
                await websocket.send_json(asdict(pong))
                
            else:
                # Unknown message type
                error = WSMessage(
                    type="error",
                    payload={"message": f"Unknown message type: {msg_type}"},
                    timestamp=int(datetime.utcnow().timestamp() * 1000)
                )
                await websocket.send_json(asdict(error))
                
    except WebSocketDisconnect:
        await manager.disconnect(connection_id)
    except Exception as e:
        await manager.disconnect(connection_id)
        print(f"WebSocket error: {e}")


@router.websocket("/ws/trades")
async def websocket_trades(websocket: WebSocket):
    """
    WebSocket endpoint for trade notifications.
    
    Broadcasts trade executions to connected clients.
    """
    connection_id = str(id(websocket))
    await manager.connect(websocket, connection_id)
    
    try:
        welcome = WSMessage(
            type="connected",
            payload={"message": "Connected to trade stream"},
            timestamp=int(datetime.utcnow().timestamp() * 1000)
        )
        await websocket.send_json(asdict(welcome))
        
        while True:
            # Keep connection alive
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                pong = WSMessage(
                    type="pong",
                    payload={},
                    timestamp=int(datetime.utcnow().timestamp() * 1000)
                )
                await websocket.send_json(asdict(pong))
                
    except WebSocketDisconnect:
        await manager.disconnect(connection_id)


@router.get("/ws/status")
async def websocket_status():
    """Get WebSocket server status"""
    return {
        "active_connections": manager.get_connection_count(),
        "active_price_streams": len([t for t in price_tasks.values() if not t.done()]),
        "timestamp": int(datetime.utcnow().timestamp() * 1000)
    }


# Function to broadcast trade notifications (called from trade service)
async def broadcast_trade_notification(trade_data: dict):
    """Broadcast a trade notification to all connected clients"""
    message = WSMessage(
        type="trade_executed",
        payload=trade_data,
        timestamp=int(datetime.utcnow().timestamp() * 1000)
    )
    await manager.broadcast_all(asdict(message))


# Function to broadcast analysis completion (called from analysis service)
async def broadcast_analysis_complete(analysis_data: dict):
    """Broadcast analysis completion to subscribers"""
    symbol = analysis_data.get("symbol", "")
    message = WSMessage(
        type="analysis_complete",
        payload=analysis_data,
        timestamp=int(datetime.utcnow().timestamp() * 1000)
    )
    await manager.broadcast_to_symbol(symbol, asdict(message))