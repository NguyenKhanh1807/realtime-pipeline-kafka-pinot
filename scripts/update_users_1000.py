#!/usr/bin/env python3
"""
Update transaction_users to 1000 users from 20 countries.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_engine
from sqlalchemy import text

def run_migration():
    """Run the migration to update users."""
    engine = get_engine()
    
    migration_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'migrations',
        '004_update_users_1000_20countries.sql'
    )
    
    if not os.path.exists(migration_file):
        print(f"Migration file not found: {migration_file}")
        return False
    
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    print("Updating users to 1000 users from 20 countries...")
    
    try:
        with engine.connect() as conn:
            for statement in sql.split(';'):
                statement = statement.strip()
                if statement:
                    conn.execute(text(statement))
            conn.commit()
        
        print("✓ Migration completed successfully!")
        
        # Verify users
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM transaction_users"))
            count = result.scalar()
            print(f"✓ Total users: {count}")
            
            # Count by country
            result = conn.execute(text("""
                SELECT country_code, COUNT(*) as count
                FROM transaction_users
                GROUP BY country_code
                ORDER BY count DESC
            """))
            
            print("\nUser distribution by country:")
            print("-" * 40)
            for row in result:
                print(f"{row[0]}: {row[1]} users")
        
        return True
        
    except Exception as e:
        print(f"✗ Error running migration: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Update Transaction Users - 1000 users, 20 countries")
    print("=" * 60)
    
    success = run_migration()
    
    if success:
        print("\n✓ Users updated successfully!")
        print("  1000 users from 20 different countries")
    else:
        print("\n✗ Failed to update users.")
        sys.exit(1)
