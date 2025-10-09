import { NextResponse } from 'next/server';
import { getAllStats } from '@/lib/performance-tracker';
import { getCacheService } from '@/lib/cache';

export async function GET() {
  try {
    // Get performance stats
    const performanceStats = getAllStats();
    
    // Get cache stats
    const cacheService = getCacheService();
    const cacheStats = cacheService.getStats();

    // Calculate overall cache hit rate
    const totalHits = cacheStats.reduce((sum, stat) => sum + stat.hit_count, 0);
    const totalMisses = cacheStats.reduce((sum, stat) => sum + stat.miss_count, 0);
    const totalRequests = totalHits + totalMisses;
    const overallCacheHitRate = totalRequests > 0 
      ? (totalHits / totalRequests) * 100 
      : 0;

    // Get top slowest routes
    const slowestRoutes = [...performanceStats]
      .sort((a, b) => b.p95 - a.p95)
      .slice(0, 10);

    // Get most active routes
    const mostActiveRoutes = [...performanceStats]
      .sort((a, b) => b.lastHour - a.lastHour)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalRoutes: performanceStats.length,
        overallCacheHitRate: Math.round(overallCacheHitRate * 10) / 10,
        totalCacheHits: totalHits,
        totalCacheMisses: totalMisses,
      },
      performanceStats,
      slowestRoutes,
      mostActiveRoutes,
      cacheStats,
    });
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

