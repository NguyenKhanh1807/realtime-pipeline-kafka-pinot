#!/usr/bin/env python3
"""
Initialize transaction_users table with 300 random users.
Run this script to populate the database with user data before starting the producer.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_engine
from app.models_transaction_user import TransactionUser
from sqlalchemy import text

def run_migration():
    """Run the migration to create and populate transaction_users table."""
    engine = get_engine()
    
    # Read the migration SQL file
    migration_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'migrations',
        '003_create_transaction_users.sql'
    )
    
    if not os.path.exists(migration_file):
        print(f"Migration file not found: {migration_file}")
        return False
    
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    print("Running migration to create transaction_users table...")
    
    try:
        with engine.connect() as conn:
            # Execute the migration SQL
            for statement in sql.split(';'):
                statement = statement.strip()
                if statement:
                    conn.execute(text(statement))
            conn.commit()
        
        print("✓ Migration completed successfully!")
        
        # Verify users were created
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM transaction_users"))
            count = result.scalar()
            print(f"✓ Created {count} users in the database")
        
        return True
        
    except Exception as e:
        print(f"✗ Error running migration: {e}")
        return False

def verify_users():
    """Verify and display sample users from the database."""
    engine = get_engine()
    
    try:
        with engine.connect() as conn:
            # Get sample users
            result = conn.execute(text("""
                SELECT user_seq, user_name, country_code, id_type, birth_date
                FROM transaction_users
                ORDER BY user_seq
                LIMIT 10
            """))
            
            print("\nSample users from database:")
            print("-" * 80)
            print(f"{'User ID':<12} {'Name':<25} {'Country':<10} {'ID Type':<10} {'Birth Date'}")
            print("-" * 80)
            
            for row in result:
                print(f"{row[0]:<12} {row[1]:<25} {row[2]:<10} {row[3]:<10} {row[4]}")
            
            print("-" * 80)
        
    except Exception as e:
        print(f"Error verifying users: {e}")

if __name__ == "__main__":
    print("=" * 80)
    print("Transaction Users Database Initialization")
    print("=" * 80)
    
    success = run_migration()
    
    if success:
        verify_users()
        print("\n✓ Database is ready for transaction generation!")
        print("  You can now start the producer to generate transactions with real user data.")
    else:
        print("\n✗ Failed to initialize database. Please check the error messages above.")
        sys.exit(1)
