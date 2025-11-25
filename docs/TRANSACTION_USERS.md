# Transaction User Management

## Overview

The data generation system has been updated to use real user data stored in PostgreSQL. This ensures consistent user information across all generated transactions.

## Features

- **300 Unique Users**: Pre-populated database with 300 unique users with realistic names
- **Consistent User Data**: Each user has a unique ID, name, country, ID type, and dates
- **Amount Range**: Transaction amounts are generated between $0 and $1000
- **Database-Backed**: All user data is stored in PostgreSQL for consistency

## Database Schema

The `transaction_users` table stores:
- `user_seq`: Unique user identifier (1000001 - 1000300)
- `user_name`: Full name of the user
- `country_code`: User's country (VN, KR, JP, SG)
- `id_type`: ID document type (ID, PASSPORT, DL)
- `birth_date`: User's birth date
- `register_date`: Registration date
- `first_transaction_date`: Date of first transaction

## Setup Instructions

### 1. Initialize the Database

Run the initialization script to create the table and populate it with 300 users:

```bash
python scripts/init_transaction_users.py
```

This will:
- Create the `transaction_users` table
- Insert 300 unique users with random but consistent data
- Display sample users to verify the setup

### 2. Start the Producer

The producer will automatically load users from the database:

```bash
# From the API
curl -X POST http://localhost:8000/api/data-generation/start \
  -H "Content-Type: application/json" \
  -d '{
    "interval_seconds": 2,
    "topic_raw": "transactions_raw",
    "bootstrap_servers": "localhost:9092",
    "start_sequence": 1
  }'

# Or directly
cd crawl_data
python rt_producer.py
```

The producer will:
- Load all 300 users from PostgreSQL at startup
- Cache the users in memory for fast access
- Generate transactions using real user IDs and names
- Create transaction amounts between $0 and $1000

## Changes Made

### 1. Database Migration (`migrations/003_create_transaction_users.sql`)
- Creates `transaction_users` table
- Populates with 300 unique users
- Adds indexes for performance

### 2. SQLAlchemy Model (`app/models_transaction_user.py`)
- Defines `TransactionUser` model
- Provides `to_dict()` method for easy serialization

### 3. Updated Producer (`crawl_data/rt_producer.py`)
- Loads users from PostgreSQL at startup
- Caches users in memory
- Maps real user data to transactions
- Generates amounts between $0-$1000
- Falls back to random generation if database is unavailable

### 4. Initialization Script (`scripts/init_transaction_users.py`)
- Runs the migration
- Verifies user creation
- Displays sample users

## Verification

After running the initialization script, verify the users:

```sql
-- Check total users
SELECT COUNT(*) FROM transaction_users;

-- View sample users
SELECT user_seq, user_name, country_code, id_type 
FROM transaction_users 
LIMIT 10;

-- Check user distribution by country
SELECT country_code, COUNT(*) 
FROM transaction_users 
GROUP BY country_code 
ORDER BY country_code;
```

## Transaction Generation

With the new system:

1. **User Consistency**: Each transaction references a real user from the database
2. **Realistic Amounts**: Deposit amounts are between $0 and $1000
3. **Proper Distribution**: Users are evenly distributed across countries (VN, KR, JP, SG)
4. **Performance**: Users are cached in memory for fast transaction generation

## Example Transaction

```json
{
  "transaction_seq": 1,
  "user_seq": 1000042,
  "user_name": "Kevin Nelson",
  "country_code": "KR",
  "id_type": "PASSPORT",
  "deposit_amount": 456.78,
  "birth_date": "1987-03-15",
  "register_date": "2015-06-20",
  ...
}
```

## Troubleshooting

### Database Connection Issues

If the producer can't connect to PostgreSQL:
- Check your `DB_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database credentials

The producer will fall back to random user generation if the database is unavailable.

### Missing Users

If no users are found:
```bash
# Re-run the initialization script
python scripts/init_transaction_users.py
```

### Amount Verification

To verify transaction amounts are within range:
```sql
SELECT 
  MIN(deposit_amount) as min_amount,
  MAX(deposit_amount) as max_amount,
  AVG(deposit_amount) as avg_amount
FROM transactions;
```
