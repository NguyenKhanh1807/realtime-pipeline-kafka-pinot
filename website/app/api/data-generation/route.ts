import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'status';
    
    console.log(`Proxying data-generation GET request to: ${BACKEND_URL}/api/data-generation/${endpoint}`);
    
    const response = await fetch(`${BACKEND_URL}/api/data-generation/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Data generation response:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying data-generation request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'start';
    
    // Read the body from the request
    const body = await request.text();
    
    console.log(`Proxying data-generation POST request to: ${BACKEND_URL}/api/data-generation/${endpoint}`);
    console.log('Request body:', body);
    
    const response = await fetch(`${BACKEND_URL}/api/data-generation/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body || undefined,
    });

    const data = await response.json();
    console.log('Data generation response:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying data-generation request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend', details: error.message },
      { status: 500 }
    );
  }
}
