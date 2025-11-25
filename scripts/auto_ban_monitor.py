#!/usr/bin/env python3
"""
Automatic User Ban Monitor
Monitors transaction labels in Pinot and automatically bans users based on rules:
1. User with 1 transaction labeled as "banned" (label=2, score>90) → BAN
2. User with 10 warning transactions (label=1, score 60-90) in a day → BAN
"""
import os
import sys
import time
import requests
import psycopg2
from datetime import datetime, timedelta
from typing import List, Dict, Set

# Database connection parameters
DB_PARAMS = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': int(os.getenv('POSTGRES_PORT', '5432')),
    'database': os.getenv('POSTGRES_DB', 'fraud_detection'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', 'postgres')
}

PINOT_QUERY_URL = 'http://localhost:3000/api/pinot/query'
CHECK_INTERVAL = 60  # Check every 60 seconds

def execute_pinot_query(sql: str) -> List[List]:
    """Execute a SQL query against Pinot via the API."""
    try:
        response = requests.post(
            PINOT_QUERY_URL,
            json={'sql': sql},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        if response.ok:
            data = response.json()
            return data.get('resultTable', {}).get('rows', [])
        else:
            print(f"Pinot query failed: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error querying Pinot: {e}")
        return []

def get_users_with_banned_transactions() -> Set[int]:
    """Get users who have ANY transaction with label=2 (banned)."""
    sql = """
        SELECT DISTINCT user_seq
        FROM transactions
        WHERE label = 2
    """
    rows = execute_pinot_query(sql)
    return {row[0] for row in rows if row}

def get_users_with_10_warnings_today() -> Set[int]:
    """Get users who have 10+ warning transactions (label=1) today."""
    # Get today's date range in milliseconds
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_ms = int(today_start.timestamp() * 1000)
    
    sql = f"""
        SELECT user_seq, COUNT(*) as warning_count
        FROM transactions
        WHERE label = 1
        AND transaction_time >= {today_start_ms}
        GROUP BY user_seq
        HAVING COUNT(*) >= 10
    """
    rows = execute_pinot_query(sql)
    return {row[0] for row in rows if row and row[1] >= 10}

def ban_user(user_seq: int, reason: str) -> bool:
    """Ban a user in PostgreSQL database."""
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = False  # Explicit transaction control
        cur = conn.cursor()
        
        # Check current status
        cur.execute(
            "SELECT status FROM transaction_users WHERE user_seq = %s",
            (user_seq,)
        )
        result = cur.fetchone()
        
        if not result:
            print(f"  User {user_seq} not found in database")
            if cur:
                cur.close()
            if conn:
                conn.close()
            return False
        
        current_status = result[0]
        
        # Skip if already banned
        if current_status == 'banned':
            if cur:
                cur.close()
            if conn:
                conn.close()
            return False
        
        # Update user status to banned
        cur.execute("""
            UPDATE transaction_users 
            SET status = 'banned',
                ban_reason = %s,
                updated_at = NOW()
            WHERE user_seq = %s
        """, (reason, user_seq))
        
        rows_affected = cur.rowcount
        
        # Also create/update entry in user_bans table if it exists
        try:
            cur.execute("""
                INSERT INTO user_bans (user_seq, ban_level, reason, banned_at, is_active)
                VALUES (%s::VARCHAR, 'banned', %s, NOW(), true)
                ON CONFLICT (user_seq, is_active) 
                DO UPDATE SET 
                    ban_level = 'banned',
                    reason = EXCLUDED.reason,
                    banned_at = NOW()
            """, (user_seq, reason))
        except Exception as e:
            # user_bans table might not exist or have different schema
            print(f"    Note: Could not update user_bans table: {e}")
        
        # COMMIT the transaction
        conn.commit()
        
        if cur:
            cur.close()
        if conn:
            conn.close()
        
        if rows_affected > 0:
            print(f"  ✓ User {user_seq} banned: {reason}")
            return True
        else:
            print(f"  ✗ User {user_seq} not updated (0 rows affected)")
            return False
        
    except Exception as e:
        print(f"  ✗ Error banning user {user_seq}: {e}")
        if conn:
            conn.rollback()
        if cur:
            cur.close()
        if conn:
            conn.close()
        return False

def check_and_ban_users():
    """Main function to check transactions and ban users based on rules."""
    print(f"\n{'='*70}")
    print(f"Auto-Ban Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print('='*70)
    
    # Rule 1: Ban users with any label=2 transaction
    print("\n[Rule 1] Checking users with banned transactions (label=2)...")
    banned_transaction_users = get_users_with_banned_transactions()
    
    if banned_transaction_users:
        print(f"Found {len(banned_transaction_users)} users with high-risk transactions")
        banned_count = 0
        for user_seq in banned_transaction_users:
            if ban_user(user_seq, "Automatic ban: High-risk transaction detected (fraud score > 90)"):
                banned_count += 1
        print(f"Result: {banned_count} users newly banned")
    else:
        print("No users with banned-level transactions found")
    
    # Rule 2: Ban users with 10+ warnings today
    print("\n[Rule 2] Checking users with 10+ warning transactions today...")
    warning_users = get_users_with_10_warnings_today()
    
    if warning_users:
        print(f"Found {len(warning_users)} users with 10+ warning transactions today")
        banned_count = 0
        for user_seq in warning_users:
            if ban_user(user_seq, "Automatic ban: 10+ suspicious transactions in one day"):
                banned_count += 1
        print(f"Result: {banned_count} users newly banned")
    else:
        print("No users with 10+ warning transactions today")
    
    print(f"\n{'='*70}")
    print(f"Check completed at {datetime.now().strftime('%H:%M:%S')}")
    print(f"Next check in {CHECK_INTERVAL} seconds...")
    print('='*70)

def main():
    """Main loop - continuously monitor and auto-ban users."""
    print("="*70)
    print("AUTO-BAN MONITOR STARTED")
    print("="*70)
    print("\nBan Rules:")
    print("  1. User with ANY transaction labeled 'banned' (label=2) → AUTO-BAN")
    print("  2. User with 10+ warning transactions (label=1) in one day → AUTO-BAN")
    print(f"\nCheck Interval: Every {CHECK_INTERVAL} seconds")
    print(f"Pinot API: {PINOT_QUERY_URL}")
    print(f"Database: {DB_PARAMS['database']} @ {DB_PARAMS['host']}")
    print("="*70)
    
    try:
        while True:
            try:
                check_and_ban_users()
            except KeyboardInterrupt:
                raise
            except Exception as e:
                print(f"\n✗ Error during check: {e}")
                import traceback
                traceback.print_exc()
            
            time.sleep(CHECK_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n\n" + "="*70)
        print("AUTO-BAN MONITOR STOPPED")
        print("="*70)
        sys.exit(0)

if __name__ == "__main__":
    main()
