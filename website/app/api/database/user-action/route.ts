import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'fraud_detection',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

export async function POST(request: NextRequest) {
  let client;
  
  try {
    const body = await request.json();
    const { userSeq, action } = body;

    if (!userSeq || !action) {
      return NextResponse.json(
        { error: 'Missing userSeq or action' },
        { status: 400 }
      );
    }

    if (!['ban', 'unban', 'warn'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be ban, unban, or warn' },
        { status: 400 }
      );
    }

    client = await pool.connect();

    // First, check if status column exists, if not create it
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='transaction_users' AND column_name='status'
        ) THEN
          ALTER TABLE transaction_users 
          ADD COLUMN status VARCHAR(20) DEFAULT 'normal';
        END IF;
      END $$;
    `);

    // Update user status based on action
    let newStatus: string;
    let banReason: string | null = null;

    if (action === 'ban') {
      newStatus = 'banned';
      banReason = 'Manually banned by admin';
      
      // Also create entry in user_bans table if it exists
      try {
        await client.query(`
          INSERT INTO user_bans (user_seq, ban_reason, banned_at, is_active)
          VALUES ($1, $2, NOW(), true)
          ON CONFLICT (user_seq) 
          DO UPDATE SET 
            ban_reason = $2,
            banned_at = NOW(),
            is_active = true
        `, [userSeq, banReason]);
      } catch (err) {
        console.log('user_bans table may not exist:', err);
      }
    } else if (action === 'unban') {
      newStatus = 'normal';
      
      // Deactivate ban in user_bans table if it exists
      try {
        await client.query(`
          UPDATE user_bans 
          SET is_active = false, unbanned_at = NOW()
          WHERE user_seq = $1
        `, [userSeq]);
      } catch (err) {
        console.log('user_bans table may not exist:', err);
      }
    } else if (action === 'warn') {
      newStatus = 'warning';
      banReason = 'Flagged for suspicious activity';
    }

    // Update user status in transaction_users table
    const result = await client.query(`
      UPDATE transaction_users 
      SET status = $1,
          ban_reason = $2
      WHERE user_seq = $3
      RETURNING *
    `, [newStatus, banReason, userSeq]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
      message: `User ${userSeq} ${action}ned successfully`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
