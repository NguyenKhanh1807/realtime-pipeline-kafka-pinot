import { NextResponse } from 'next/server';
import { query } from '@/src/lib/db';

export async function GET() {
  try {
    // Query the user_bans table for all bans
    const result = await query(
      `SELECT 
        id,
        user_seq,
        ban_level,
        reason,
        banned_by,
        banned_at,
        unbanned_at,
        is_active,
        created_at,
        updated_at
       FROM user_bans 
       ORDER BY banned_at DESC`,
      []
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching user bans:', error);
    
    // If table doesn't exist yet, return empty array
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.warn('user_bans table does not exist. Run migrations first.');
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user bans', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
