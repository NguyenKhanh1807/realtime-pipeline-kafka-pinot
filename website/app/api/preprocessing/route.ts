import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// API chạy script Python preProcessing để lấy số liệu EDA/tiền xử lý cho UI
export async function GET() {
  const repoRoot = path.resolve(process.cwd(), '..');
  const scriptPath = path.join(repoRoot, 'scripts', 'preprocessing_summary.py');
  const pythonBin = process.env.PYTHON_PATH || 'python3';

  try {
    const { stdout } = await execFileAsync(pythonBin, [scriptPath], {
      cwd: repoRoot,
      timeout: 20000,
    });

    const body = stdout?.trim();
    const parsed = body ? JSON.parse(body) : {};
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('[preprocessing API] Failed to run Python script', error);
    return NextResponse.json(
      { error: 'Không chạy được pipeline preProcessing', detail: String(error) },
      { status: 500 }
    );
  }
}
