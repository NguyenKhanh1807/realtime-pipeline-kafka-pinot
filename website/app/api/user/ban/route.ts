import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/src/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_seq, ban_level = 'banned', reason = 'Fraudulent activity detected', banned_by = 'system' } = body;

    if (!user_seq) {
      return NextResponse.json(
        { error: 'user_seq is required' },
        { status: 400 }
      );
    }

    // First, deactivate any existing active bans for this user
    await query(
      'UPDATE user_bans SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_seq = $1 AND is_active = TRUE',
      [user_seq]
    );

    // Insert new ban record
    const result = await query(
      `INSERT INTO user_bans (user_seq, ban_level, reason, banned_by, is_active) 
       VALUES ($1, $2, $3, $4, TRUE) 
       RETURNING *`,
      [user_seq, ban_level, reason, banned_by]
    );

    return NextResponse.json({
      success: true,
      ban: result.rows[0],
      message: `User ${user_seq} has been ${ban_level === 'banned' ? 'banned' : 'flagged'} successfully`,
    });
  } catch (error) {
    console.error('Error banning user:', error);
    return NextResponse.json(
      { error: 'Failed to ban user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
