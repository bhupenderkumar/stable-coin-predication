"""
Scheduler Service - Background Tasks

This service handles scheduled background tasks like:
- Periodic token data refresh
- Market scanning
- Alert system

Uses APScheduler for task management.
"""

from typing import Callable, Optional
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.config import settings


class SchedulerService:
    """Background task scheduler using APScheduler."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._started = False
    
    def start(self):
        """Start the scheduler."""
        if not self._started:
            self.scheduler.start()
            self._started = True
            print("Scheduler started")
    
    def stop(self):
        """Stop the scheduler."""
        if self._started:
            self.scheduler.shutdown()
            self._started = False
            print("Scheduler stopped")
    
    def add_interval_job(
        self,
        func: Callable,
        seconds: int = 60,
        job_id: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Add an interval-based job.
        
        Args:
            func: Function to execute
            seconds: Interval in seconds
            job_id: Optional job identifier
        
        Returns:
            Job ID
        """
        job = self.scheduler.add_job(
            func,
            trigger=IntervalTrigger(seconds=seconds),
            id=job_id,
            replace_existing=True,
            **kwargs
        )
        return job.id
    
    def add_cron_job(
        self,
        func: Callable,
        hour: int = 0,
        minute: int = 0,
        job_id: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Add a cron-based job (daily at specific time).
        
        Args:
            func: Function to execute
            hour: Hour to run (0-23)
            minute: Minute to run (0-59)
            job_id: Optional job identifier
        
        Returns:
            Job ID
        """
        job = self.scheduler.add_job(
            func,
            trigger=CronTrigger(hour=hour, minute=minute),
            id=job_id,
            replace_existing=True,
            **kwargs
        )
        return job.id
    
    def remove_job(self, job_id: str) -> bool:
        """Remove a scheduled job."""
        try:
            self.scheduler.remove_job(job_id)
            return True
        except Exception:
            return False
    
    def get_jobs(self):
        """Get list of all scheduled jobs."""
        return [
            {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None
            }
            for job in self.scheduler.get_jobs()
        ]


# Example scheduled tasks

async def refresh_token_cache():
    """Refresh token data cache."""
    from app.services.data_fetcher import data_fetcher
    from app.utils.cache import cache
    
    print(f"[{datetime.now()}] Refreshing token cache...")
    try:
        tokens = await data_fetcher.get_birdeye_tokens()
        if tokens:
            await cache.set_tokens(tokens, ttl=120)
            print(f"Cached {len(tokens)} tokens")
    except Exception as e:
        print(f"Cache refresh error: {e}")


async def scan_market_opportunities():
    """Scan market for trading opportunities."""
    from app.services.data_fetcher import data_fetcher
    from app.services.ai_analyzer import ai_analyzer
    
    print(f"[{datetime.now()}] Scanning market...")
    # This would scan top tokens and identify opportunities
    # Implementation depends on specific strategy


# Global scheduler instance
scheduler_service = SchedulerService()
