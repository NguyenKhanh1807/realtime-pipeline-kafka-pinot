import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false } = body;

    // Forward request to FastAPI backend
    console.log('Forwarding training request to backend...');
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/mlflow/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }

    console.log('Training completed successfully');
    return NextResponse.json(result);

  } catch (error) {
    console.error('Training error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Training failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
