import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function GET() {
  try {
    // Execute kafka-consumer-groups command to get lag information
    const { stdout, stderr } = await execPromise(
      'docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --group rt-processor-v1 --describe 2>/dev/null'
    );

    if (stderr && !stdout) {
      return NextResponse.json(
        { error: 'Failed to fetch Kafka consumer lag', totalLag: 0 },
        { status: 500 }
      );
    }

    // Parse the output to extract lag information
    const lines = stdout.trim().split('\n');
    let totalLag = 0;
    const consumerDetails = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse the space-separated values
      const parts = line.split(/\s+/);
      
      if (parts.length >= 6) {
        const topic = parts[1];
        const partition = parseInt(parts[2]);
        const currentOffset = parseInt(parts[3]);
        const logEndOffset = parseInt(parts[4]);
        const lag = parseInt(parts[5]);

        if (!isNaN(lag)) {
          totalLag += lag;
          consumerDetails.push({
            topic,
            partition,
            currentOffset,
            logEndOffset,
            lag,
          });
        }
      }
    }

    return NextResponse.json({
      totalLag,
      consumerGroup: 'rt-processor-v1',
      consumers: consumerDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching Kafka lag:', error);
    return NextResponse.json(
      { error: 'Internal server error', totalLag: 0 },
      { status: 500 }
    );
  }
}
