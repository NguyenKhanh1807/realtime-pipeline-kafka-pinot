import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  try {
    // Forward query parameters to backend
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10000';
    const offset = searchParams.get('offset') || '0';
    
    const response = await fetch(
      `${BACKEND_URL}/api/transaction-users?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const users = await response.json();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching transaction users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction users' },
      { status: 500 }
    );
  }
}
