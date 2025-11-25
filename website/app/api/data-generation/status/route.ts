import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET() {
  try {
    console.log(`Fetching data generation status from: ${BACKEND_URL}/api/data-generation/status`);
    
    const response = await fetch(`${BACKEND_URL}/api/data-generation/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: 'Backend error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Data generation status:', data);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching data generation status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error.message },
      { status: 500 }
    );
  }
}
