"""
Automatic User Ban Monitor
Monitors transactions in Pinot and automatically updates user status in PostgreSQL based on risk levels:
- High Risk (fraud_score > 90) → Ban user
- Medium Risk (fraud_score 60-90) → Warn user
- Normal (fraud_score < 60) → Keep normal
"""

import os
import sys
import time
import logging
import requests
from datetime import datetime
from sqlalchemy import create_engine, text
from typing import Dict, Set

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AutoUserBanMonitor:
    def __init__(self, db_url: str, pinot_broker_url: str, check_interval: int = 30):
        """
        Initialize the auto ban monitor.
        
        Args:
            db_url: PostgreSQL connection string
            pinot_broker_url: Pinot broker URL
            check_interval: How often to check (in seconds)
        """
        self.db_url = db_url
        self.pinot_broker_url = pinot_broker_url
        self.check_interval = check_interval
        self.engine = create_engine(db_url)
        
        # Track which users we've already processed to avoid spam
        self.processed_users: Set[str] = set()
        
    def query_pinot(self, sql: str) -> dict:
        """Execute a SQL query against Pinot."""
        try:
            response = requests.post(
                f"{self.pinot_broker_url}/query/sql",
                json={"sql": sql},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error querying Pinot: {e}")
            return {}
    
    def get_high_risk_users(self) -> Dict[str, dict]:
        """
        Get users with high-risk transactions (fraud_score > 90).
        Returns dict of {user_seq: {transaction_count, max_score, avg_score}}
        """
        sql = """
            SELECT 
                user_seq,
                COUNT(*) as tx_count,
                MAX(fraud_score) as max_score,
                AVG(fraud_score) as avg_score
            FROM transactions
            WHERE label = 2
            GROUP BY user_seq
            HAVING COUNT(*) >= 1
        """
        
        result = self.query_pinot(sql)
        users = {}
        
        if result.get('resultTable', {}).get('rows'):
            for row in result['resultTable']['rows']:
                user_seq = str(row[0])
                users[user_seq] = {
                    'tx_count': row[1],
                    'max_score': row[2],
                    'avg_score': row[3],
                    'risk_level': 'banned'
                }
        
        return users
    
    def get_medium_risk_users(self) -> Dict[str, dict]:
        """
        Get users with medium-risk transactions (fraud_score 60-90).
        Returns dict of {user_seq: {transaction_count, max_score, avg_score}}
        """
        sql = """
            SELECT 
                user_seq,
                COUNT(*) as tx_count,
                MAX(fraud_score) as max_score,
                AVG(fraud_score) as avg_score
            FROM transactions
            WHERE label = 1
            GROUP BY user_seq
            HAVING COUNT(*) >= 2
        """
        
        result = self.query_pinot(sql)
        users = {}
        
        if result.get('resultTable', {}).get('rows'):
            for row in result['resultTable']['rows']:
                user_seq = str(row[0])
                users[user_seq] = {
                    'tx_count': row[1],
                    'max_score': row[2],
                    'avg_score': row[3],
                    'risk_level': 'warning'
                }
        
        return users
    
    def update_user_status(self, user_seq: str, new_status: str, reason: str):
        """Update user status in PostgreSQL."""
        try:
            with self.engine.connect() as conn:
                # Update transaction_users table
                conn.execute(
                    text("""
                        UPDATE transaction_users 
                        SET status = :status, ban_reason = :reason
                        WHERE user_seq = :user_seq
                    """),
                    {"status": new_status, "reason": reason, "user_seq": int(user_seq)}
                )
                
                # Update user_bans table
                if new_status == 'banned':
                    # Deactivate existing bans
                    conn.execute(
                        text("""
                            UPDATE user_bans 
                            SET is_active = false, unbanned_at = NOW()
                            WHERE user_seq = :user_seq AND is_active = true
                        """),
                        {"user_seq": user_seq}
                    )
                    
                    # Insert new ban
                    conn.execute(
                        text("""
                            INSERT INTO user_bans (user_seq, ban_level, reason, banned_by, banned_at, is_active)
                            VALUES (:user_seq, 'banned', :reason, 'auto-monitor', NOW(), true)
                        """),
                        {"user_seq": user_seq, "reason": reason}
                    )
                elif new_status == 'warning':
                    # Deactivate existing warnings
                    conn.execute(
                        text("""
                            UPDATE user_bans 
                            SET is_active = false, unbanned_at = NOW()
                            WHERE user_seq = :user_seq AND is_active = true
                        """),
                        {"user_seq": user_seq}
                    )
                    
                    # Insert new warning
                    conn.execute(
                        text("""
                            INSERT INTO user_bans (user_seq, ban_level, reason, banned_by, banned_at, is_active)
                            VALUES (:user_seq, 'warning', :reason, 'auto-monitor', NOW(), true)
                        """),
                        {"user_seq": user_seq, "reason": reason}
                    )
                
                conn.commit()
                logger.info(f"Updated user {user_seq} to status '{new_status}': {reason}")
                
        except Exception as e:
            logger.error(f"Error updating user {user_seq}: {e}")
    
    def check_and_update_users(self):
        """Main monitoring loop - check Pinot and update user statuses."""
        try:
            logger.info("Checking for high-risk and medium-risk users...")
            
            # Get high-risk users (should be banned)
            high_risk_users = self.get_high_risk_users()
            for user_seq, info in high_risk_users.items():
                cache_key = f"{user_seq}:banned"
                if cache_key not in self.processed_users:
                    reason = (
                        f"Automatically banned: {info['tx_count']} high-risk transactions detected "
                        f"(max score: {info['max_score']:.1f}, avg: {info['avg_score']:.1f})"
                    )
                    self.update_user_status(user_seq, 'banned', reason)
                    self.processed_users.add(cache_key)
            
            # Get medium-risk users (should be warned)
            medium_risk_users = self.get_medium_risk_users()
            for user_seq, info in medium_risk_users.items():
                # Skip if already banned
                if user_seq in high_risk_users:
                    continue
                
                cache_key = f"{user_seq}:warning"
                if cache_key not in self.processed_users:
                    reason = (
                        f"Automatically flagged: {info['tx_count']} medium-risk transactions detected "
                        f"(max score: {info['max_score']:.1f}, avg: {info['avg_score']:.1f})"
                    )
                    self.update_user_status(user_seq, 'warning', reason)
                    self.processed_users.add(cache_key)
            
            logger.info(
                f"Processed {len(high_risk_users)} high-risk users, "
                f"{len(medium_risk_users)} medium-risk users"
            )
            
        except Exception as e:
            logger.error(f"Error in check_and_update_users: {e}")
    
    def run(self):
        """Run the monitoring loop continuously."""
        logger.info(f"Starting Auto User Ban Monitor (checking every {self.check_interval}s)")
        logger.info(f"Pinot broker: {self.pinot_broker_url}")
        logger.info(f"Database: {self.db_url.split('@')[1] if '@' in self.db_url else 'configured'}")
        
        while True:
            try:
                self.check_and_update_users()
                
                # Clear processed cache periodically (every hour)
                if len(self.processed_users) > 1000:
                    logger.info("Clearing processed users cache")
                    self.processed_users.clear()
                
                time.sleep(self.check_interval)
                
            except KeyboardInterrupt:
                logger.info("Shutting down Auto User Ban Monitor...")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                time.sleep(self.check_interval)


if __name__ == "__main__":
    # Get configuration from environment
    # Support both DB_URL and individual DB parameters
    db_url = os.getenv("DB_URL")
    if not db_url:
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "fraud_detection")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "postgres")
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    pinot_broker_url = os.getenv(
        "PINOT_BROKER_URL",
        "http://localhost:8099"
    )
    check_interval = int(os.getenv("CHECK_INTERVAL", "30"))
    
    # Create and run monitor
    monitor = AutoUserBanMonitor(db_url, pinot_broker_url, check_interval)
    monitor.run()
