import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST() {
  try {
    console.log(`Stopping data generation at: ${BACKEND_URL}/api/data-generation/stop`);
    
    const response = await fetch(`${BACKEND_URL}/api/data-generation/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Data generation stopped:', data);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error stopping data generation:', error);
    return NextResponse.json(
      { error: 'Failed to stop data generation', details: error.message },
      { status: 500 }
    );
  }
}
