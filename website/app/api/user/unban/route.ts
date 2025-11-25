import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/src/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_seq } = body;

    if (!user_seq) {
      return NextResponse.json(
        { error: 'user_seq is required' },
        { status: 400 }
      );
    }

    // Deactivate all active bans for this user
    const result = await query(
      `UPDATE user_bans 
       SET is_active = FALSE, unbanned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE user_seq = $1 AND is_active = TRUE
       RETURNING *`,
      [user_seq]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active ban found for this user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${user_seq} has been unbanned successfully`,
      unbanned_records: result.rows,
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    return NextResponse.json(
      { error: 'Failed to unban user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
