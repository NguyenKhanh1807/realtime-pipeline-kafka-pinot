#!/usr/bin/env python3
"""
Clear all user bans from PostgreSQL database.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_engine
from sqlalchemy import text

def clear_bans():
    """Clear all user bans."""
    engine = get_engine()
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("DELETE FROM user_bans"))
            conn.commit()
            count = result.rowcount
            print(f"✓ Deleted {count} user ban records")
        return True
    except Exception as e:
        print(f"✗ Error clearing bans: {e}")
        return False

if __name__ == "__main__":
    print("Clearing all user bans...")
    success = clear_bans()
    
    if success:
        print("✓ User bans cleared successfully!")
    else:
        print("✗ Failed to clear user bans.")
        sys.exit(1)
