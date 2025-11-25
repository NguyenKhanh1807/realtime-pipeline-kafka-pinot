import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/transaction-users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const users = await response.json();
    
    return NextResponse.json({
      users: users || [],
      count: users?.length || 0
    });
  } catch (error: any) {
    console.error('Error fetching users from PostgreSQL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message, users: [], count: 0 },
      { status: 500 }
    );
  }
}
