#!/usr/bin/env python3
"""
Run migration 004: Add user status columns
"""
import psycopg2
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_migration():
    """Run the migration to add status and ban_reason columns."""
    
    # Database connection parameters
    db_params = {
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': int(os.getenv('POSTGRES_PORT', '5432')),
        'database': os.getenv('POSTGRES_DB', 'fraud_detection'),
        'user': os.getenv('POSTGRES_USER', 'postgres'),
        'password': os.getenv('POSTGRES_PASSWORD', 'postgres')
    }
    
    print("Connecting to database...")
    print(f"Host: {db_params['host']}")
    print(f"Database: {db_params['database']}")
    print(f"User: {db_params['user']}")
    
    try:
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        print("\nRunning migration 004: Add user status columns...")
        
        # Read migration file
        migration_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'migrations',
            '004_add_user_status_columns.sql'
        )
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✓ Migration completed successfully!")
        
        # Verify columns were added
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'transaction_users' 
            AND column_name IN ('status', 'ban_reason')
            ORDER BY column_name
        """)
        
        columns = cursor.fetchall()
        print("\nVerification - Columns added:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (default: {col[2]})")
        
        # Check how many users have status set
        cursor.execute("""
            SELECT 
                status, 
                COUNT(*) as count 
            FROM transaction_users 
            GROUP BY status
            ORDER BY status
        """)
        
        status_counts = cursor.fetchall()
        print("\nUser status distribution:")
        for status, count in status_counts:
            print(f"  - {status}: {count} users")
        
        cursor.close()
        conn.close()
        
        print("\n✓ Migration 004 completed successfully!")
        
    except Exception as e:
        print(f"✗ Error running migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
