"""
Alert Service - Email and Telegram Notifications

Provides notification capabilities for:
- Trade executions
- AI analysis results
- Price alerts
- System health updates
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)


class AlertType(Enum):
    """Types of alerts that can be sent."""
    TRADE_EXECUTED = "trade_executed"
    TRADE_FAILED = "trade_failed"
    ANALYSIS_COMPLETE = "analysis_complete"
    PRICE_ALERT = "price_alert"
    OPPORTUNITY_FOUND = "opportunity_found"
    STOP_LOSS_TRIGGERED = "stop_loss_triggered"
    SYSTEM_ERROR = "system_error"
    DAILY_SUMMARY = "daily_summary"


class AlertPriority(Enum):
    """Priority levels for alerts."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Alert:
    """Alert data structure."""
    type: AlertType
    title: str
    message: str
    priority: AlertPriority = AlertPriority.MEDIUM
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class AlertChannel(ABC):
    """Abstract base class for alert channels."""
    
    @abstractmethod
    async def send(self, alert: Alert) -> bool:
        """Send an alert through this channel."""
        pass
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the channel is properly configured."""
        pass


class EmailChannel(AlertChannel):
    """Email notification channel."""
    
    def __init__(
        self,
        smtp_host: str = None,
        smtp_port: int = 587,
        smtp_user: str = None,
        smtp_password: str = None,
        sender_email: str = None,
        recipient_emails: List[str] = None,
    ):
        self.smtp_host = smtp_host or getattr(settings, 'smtp_host', None)
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user or getattr(settings, 'smtp_user', None)
        self.smtp_password = smtp_password or getattr(settings, 'smtp_password', None)
        self.sender_email = sender_email or getattr(settings, 'alert_sender_email', None)
        self.recipient_emails = recipient_emails or getattr(settings, 'alert_recipient_emails', '').split(',')
    
    def is_configured(self) -> bool:
        """Check if email is properly configured."""
        return all([
            self.smtp_host,
            self.smtp_user,
            self.smtp_password,
            self.sender_email,
            self.recipient_emails,
        ])
    
    async def send(self, alert: Alert) -> bool:
        """Send an email alert."""
        if not self.is_configured():
            logger.warning("Email channel not configured, skipping alert")
            return False
        
        try:
            # Create email message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[{alert.priority.value.upper()}] {alert.title}"
            msg["From"] = self.sender_email
            msg["To"] = ", ".join(self.recipient_emails)
            
            # Create HTML content
            html_content = self._format_html(alert)
            text_content = self._format_text(alert)
            
            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))
            
            # Send email
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=True,
            ) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(msg)
            
            logger.info(f"Email alert sent: {alert.title}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False
    
    def _format_html(self, alert: Alert) -> str:
        """Format alert as HTML email."""
        priority_colors = {
            AlertPriority.LOW: "#3498db",
            AlertPriority.MEDIUM: "#f39c12",
            AlertPriority.HIGH: "#e74c3c",
            AlertPriority.CRITICAL: "#c0392b",
        }
        
        color = priority_colors.get(alert.priority, "#3498db")
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: {color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🤖 Meme Trading Bot</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f9; border: 1px solid #ddd;">
                <h2 style="color: #333; margin-top: 0;">{alert.title}</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">{alert.message}</p>
        """
        
        if alert.data:
            html += """
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            """
            for key, value in alert.data.items():
                html += f"""
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;">
                            {key.replace('_', ' ').title()}
                        </td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #666;">
                            {value}
                        </td>
                    </tr>
                """
            html += "</table>"
        
        html += f"""
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    Sent at {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}
                </p>
            </div>
            <div style="padding: 15px; background: #333; color: #999; text-align: center; border-radius: 0 0 8px 8px;">
                <small>Solana Meme Coin Trading Bot</small>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _format_text(self, alert: Alert) -> str:
        """Format alert as plain text email."""
        text = f"""
Meme Trading Bot Alert
======================

{alert.title}

{alert.message}
"""
        
        if alert.data:
            text += "\nDetails:\n"
            for key, value in alert.data.items():
                text += f"  - {key.replace('_', ' ').title()}: {value}\n"
        
        text += f"\nSent at {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}"
        
        return text


class TelegramChannel(AlertChannel):
    """Telegram notification channel."""
    
    def __init__(
        self,
        bot_token: str = None,
        chat_id: str = None,
    ):
        self.bot_token = bot_token or getattr(settings, 'telegram_bot_token', None)
        self.chat_id = chat_id or getattr(settings, 'telegram_chat_id', None)
        self._base_url = "https://api.telegram.org"
    
    def is_configured(self) -> bool:
        """Check if Telegram is properly configured."""
        return all([self.bot_token, self.chat_id])
    
    async def send(self, alert: Alert) -> bool:
        """Send a Telegram alert."""
        if not self.is_configured():
            logger.warning("Telegram channel not configured, skipping alert")
            return False
        
        try:
            import httpx
            
            message = self._format_message(alert)
            url = f"{self._base_url}/bot{self.bot_token}/sendMessage"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "chat_id": self.chat_id,
                        "text": message,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    },
                    timeout=10.0,
                )
                
                if response.status_code == 200:
                    logger.info(f"Telegram alert sent: {alert.title}")
                    return True
                else:
                    logger.error(f"Telegram API error: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")
            return False
    
    def _format_message(self, alert: Alert) -> str:
        """Format alert as Telegram message."""
        priority_emojis = {
            AlertPriority.LOW: "ℹ️",
            AlertPriority.MEDIUM: "⚠️",
            AlertPriority.HIGH: "🚨",
            AlertPriority.CRITICAL: "🔴",
        }
        
        type_emojis = {
            AlertType.TRADE_EXECUTED: "✅",
            AlertType.TRADE_FAILED: "❌",
            AlertType.ANALYSIS_COMPLETE: "🤖",
            AlertType.PRICE_ALERT: "📊",
            AlertType.OPPORTUNITY_FOUND: "💰",
            AlertType.STOP_LOSS_TRIGGERED: "🛑",
            AlertType.SYSTEM_ERROR: "⚙️",
            AlertType.DAILY_SUMMARY: "📈",
        }
        
        emoji = type_emojis.get(alert.type, "📢")
        priority = priority_emojis.get(alert.priority, "")
        
        message = f"{priority} {emoji} <b>{alert.title}</b>\n\n{alert.message}"
        
        if alert.data:
            message += "\n\n<b>Details:</b>"
            for key, value in alert.data.items():
                message += f"\n• {key.replace('_', ' ').title()}: <code>{value}</code>"
        
        message += f"\n\n<i>{alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}</i>"
        
        return message


class AlertService:
    """Main alert service that manages multiple channels."""
    
    def __init__(self):
        self.channels: List[AlertChannel] = []
        self._setup_channels()
    
    def _setup_channels(self):
        """Setup available notification channels."""
        # Add email channel
        email = EmailChannel()
        if email.is_configured():
            self.channels.append(email)
            logger.info("Email alerts enabled")
        
        # Add Telegram channel
        telegram = TelegramChannel()
        if telegram.is_configured():
            self.channels.append(telegram)
            logger.info("Telegram alerts enabled")
        
        if not self.channels:
            logger.warning("No alert channels configured")
    
    async def send_alert(self, alert: Alert) -> Dict[str, bool]:
        """Send an alert through all configured channels."""
        results = {}
        
        tasks = [channel.send(alert) for channel in self.channels]
        channel_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for channel, result in zip(self.channels, channel_results):
            channel_name = channel.__class__.__name__
            if isinstance(result, Exception):
                logger.error(f"Alert failed for {channel_name}: {result}")
                results[channel_name] = False
            else:
                results[channel_name] = result
        
        return results
    
    # Convenience methods for common alerts
    
    async def notify_trade_executed(
        self,
        symbol: str,
        trade_type: str,
        amount: float,
        price: float,
        total: float,
    ) -> Dict[str, bool]:
        """Send notification for executed trade."""
        alert = Alert(
            type=AlertType.TRADE_EXECUTED,
            title=f"Trade Executed: {trade_type} {symbol}",
            message=f"Successfully executed {trade_type} order for {symbol}.",
            priority=AlertPriority.MEDIUM,
            data={
                "symbol": symbol,
                "type": trade_type,
                "amount": f"${amount:.2f}",
                "price": f"${price:.8f}",
                "total": f"${total:.2f}",
            },
        )
        return await self.send_alert(alert)
    
    async def notify_trade_failed(
        self,
        symbol: str,
        trade_type: str,
        amount: float,
        error: str,
    ) -> Dict[str, bool]:
        """Send notification for failed trade."""
        alert = Alert(
            type=AlertType.TRADE_FAILED,
            title=f"Trade Failed: {trade_type} {symbol}",
            message=f"Trade execution failed. Error: {error}",
            priority=AlertPriority.HIGH,
            data={
                "symbol": symbol,
                "type": trade_type,
                "amount": f"${amount:.2f}",
                "error": error,
            },
        )
        return await self.send_alert(alert)
    
    async def notify_analysis_complete(
        self,
        symbol: str,
        decision: str,
        confidence: int,
        reasoning: str,
    ) -> Dict[str, bool]:
        """Send notification for completed analysis."""
        alert = Alert(
            type=AlertType.ANALYSIS_COMPLETE,
            title=f"AI Analysis: {symbol} - {decision}",
            message=reasoning[:200] + "..." if len(reasoning) > 200 else reasoning,
            priority=AlertPriority.LOW if decision == "HOLD" else AlertPriority.MEDIUM,
            data={
                "symbol": symbol,
                "decision": decision,
                "confidence": f"{confidence}%",
            },
        )
        return await self.send_alert(alert)
    
    async def notify_price_alert(
        self,
        symbol: str,
        current_price: float,
        target_price: float,
        direction: str,
    ) -> Dict[str, bool]:
        """Send price alert notification."""
        alert = Alert(
            type=AlertType.PRICE_ALERT,
            title=f"Price Alert: {symbol}",
            message=f"{symbol} has {direction} your target price of ${target_price:.8f}",
            priority=AlertPriority.MEDIUM,
            data={
                "symbol": symbol,
                "current_price": f"${current_price:.8f}",
                "target_price": f"${target_price:.8f}",
                "direction": direction,
            },
        )
        return await self.send_alert(alert)
    
    async def notify_opportunity_found(
        self,
        symbol: str,
        confidence: int,
        potential_gain: float,
        reasoning: str,
    ) -> Dict[str, bool]:
        """Send notification for trading opportunity."""
        alert = Alert(
            type=AlertType.OPPORTUNITY_FOUND,
            title=f"Opportunity Found: {symbol}",
            message=reasoning[:200] + "..." if len(reasoning) > 200 else reasoning,
            priority=AlertPriority.HIGH if confidence >= 80 else AlertPriority.MEDIUM,
            data={
                "symbol": symbol,
                "confidence": f"{confidence}%",
                "potential_gain": f"+{potential_gain:.1f}%",
            },
        )
        return await self.send_alert(alert)
    
    async def notify_stop_loss_triggered(
        self,
        symbol: str,
        entry_price: float,
        exit_price: float,
        loss: float,
        loss_percentage: float,
    ) -> Dict[str, bool]:
        """Send notification for stop-loss trigger."""
        alert = Alert(
            type=AlertType.STOP_LOSS_TRIGGERED,
            title=f"Stop-Loss Triggered: {symbol}",
            message=f"Position closed due to stop-loss. Loss: ${loss:.2f} ({loss_percentage:.1f}%)",
            priority=AlertPriority.HIGH,
            data={
                "symbol": symbol,
                "entry_price": f"${entry_price:.8f}",
                "exit_price": f"${exit_price:.8f}",
                "loss": f"-${loss:.2f}",
                "loss_percentage": f"-{loss_percentage:.1f}%",
            },
        )
        return await self.send_alert(alert)
    
    async def notify_system_error(
        self,
        component: str,
        error: str,
        details: Optional[str] = None,
    ) -> Dict[str, bool]:
        """Send notification for system error."""
        alert = Alert(
            type=AlertType.SYSTEM_ERROR,
            title=f"System Error: {component}",
            message=error,
            priority=AlertPriority.CRITICAL,
            data={
                "component": component,
                "error": error,
                "details": details or "N/A",
            },
        )
        return await self.send_alert(alert)


# Global alert service instance
alert_service = AlertService()