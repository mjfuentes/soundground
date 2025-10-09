import { NextResponse } from 'next/server';
import { getRecentLogs } from '@/lib/log-store';

export async function GET() {
  try {
    const logs = getRecentLogs(100); // Get last 100 logs

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

