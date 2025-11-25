import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log(`Starting data generation at: ${BACKEND_URL}/api/data-generation/start`);
    console.log('Config:', body);
    
    const response = await fetch(`${BACKEND_URL}/api/data-generation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    console.log('Data generation started:', data);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error starting data generation:', error);
    return NextResponse.json(
      { error: 'Failed to start data generation', details: error.message },
      { status: 500 }
    );
  }
}
