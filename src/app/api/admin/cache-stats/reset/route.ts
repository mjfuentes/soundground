import { NextResponse } from 'next/server';
import { getCacheService } from '@/lib/cache';

export async function POST() {
  try {
    const cacheService = getCacheService();
    cacheService.resetStats();

    return NextResponse.json({ success: true, message: 'Cache statistics reset' });
  } catch (error) {
    console.error('Failed to reset cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to reset cache statistics' },
      { status: 500 }
    );
  }
}

