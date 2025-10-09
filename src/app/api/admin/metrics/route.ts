import { NextResponse } from 'next/server';
import { getRequestMetrics } from '@/lib/request-tracker';

export async function GET() {
  try {
    const metrics = getRequestMetrics();
    
    // Calculate uptime
    const uptimeMs = Date.now() - metrics.startTime;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const uptime = `${hours}h ${minutes}m`;

    return NextResponse.json({
      totalRequests: metrics.totalRequests,
      uptime,
      startTime: new Date(metrics.startTime).toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

