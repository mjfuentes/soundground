import { NextResponse } from 'next/server';
import { getCacheService } from '@/lib/cache';

export async function GET() {
  try {
    const cacheService = getCacheService();
    const stats = cacheService.getStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache statistics' },
      { status: 500 }
    );
  }
}

