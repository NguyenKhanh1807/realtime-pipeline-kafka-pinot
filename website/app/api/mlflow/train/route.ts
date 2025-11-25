import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false } = body;

    // Path to training script
    const scriptPath = '/home/nam/study/realtime-pipeline-kafka-pinot/scripts/train_fraud_model.py';

    // Check if sufficient data exists
    if (!force) {
      const pinotRes = await fetch('http://localhost:8099/query/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'SELECT COUNT(*) as total, SUM(label) as fraud_count FROM transactions'
        })
      });

      if (pinotRes.ok) {
        const result = await pinotRes.json();
        const rows = result?.resultTable?.rows || [];
        if (rows.length > 0) {
          const [total, fraudCount] = rows[0];
          
          if (total < 500) {
            return NextResponse.json({
              success: false,
              message: `Insufficient data: ${total} transactions (minimum 500 required)`,
              total,
              fraudCount
            }, { status: 400 });
          }

          if (fraudCount === 0) {
            return NextResponse.json({
              success: false,
              message: 'No fraud cases found. Model needs labeled fraud examples.',
              total,
              fraudCount
            }, { status: 400 });
          }
        }
      }
    }

    // Trigger training in background
    console.log('Starting model training...');
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath}`, {
      timeout: 600000, // 10 minutes
      cwd: '/home/nam/study/realtime-pipeline-kafka-pinot'
    });

    console.log('Training output:', stdout);
    if (stderr) {
      console.error('Training stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Model training completed successfully',
      output: stdout.split('\n').slice(-20).join('\n') // Last 20 lines
    });

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
