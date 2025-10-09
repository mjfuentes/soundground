/**
 * Performance tracking for monitoring response times and cache effectiveness
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger({ component: 'PerformanceTracker' });

export interface PerformanceMetric {
  route: string;
  method: string;
  duration: number;
  timestamp: number;
  cacheHit?: boolean;
  statusCode?: number;
}

export interface PerformanceStats {
  route: string;
  totalRequests: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  cacheHitRate: number;
  p50: number;
  p95: number;
  p99: number;
  lastHour: number;
}

interface RouteMetrics {
  durations: number[];
  cacheHits: number;
  cacheMisses: number;
  timestamps: number[];
}

// In-memory storage for metrics (for production, consider Redis or similar)
const metricsStore = new Map<string, RouteMetrics>();
const MAX_SAMPLES_PER_ROUTE = 1000; // Keep last 1000 samples per route
const METRICS_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Track a performance metric
 */
export function trackPerformance(metric: PerformanceMetric): void {
  const key = `${metric.method}:${metric.route}`;
  
  if (!metricsStore.has(key)) {
    metricsStore.set(key, {
      durations: [],
      cacheHits: 0,
      cacheMisses: 0,
      timestamps: [],
    });
  }

  const metrics = metricsStore.get(key)!;
  
  // Add new metric
  metrics.durations.push(metric.duration);
  metrics.timestamps.push(metric.timestamp);
  
  if (metric.cacheHit !== undefined) {
    if (metric.cacheHit) {
      metrics.cacheHits++;
    } else {
      metrics.cacheMisses++;
    }
  }

  // Keep only recent samples to prevent memory growth
  if (metrics.durations.length > MAX_SAMPLES_PER_ROUTE) {
    metrics.durations.shift();
    metrics.timestamps.shift();
  }

  // Log slow requests
  if (metric.duration > 1000) {
    logger.warn('Slow request detected', {
      route: metric.route,
      duration: `${metric.duration}ms`,
      cacheHit: metric.cacheHit,
    });
  }
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get statistics for a specific route
 */
export function getRouteStats(route: string): PerformanceStats | null {
  const metrics = metricsStore.get(route);
  if (!metrics || metrics.durations.length === 0) {
    return null;
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Count requests in last hour
  const lastHour = metrics.timestamps.filter(ts => ts > oneHourAgo).length;

  const totalRequests = metrics.durations.length;
  const avgDuration = metrics.durations.reduce((a, b) => a + b, 0) / totalRequests;
  const minDuration = Math.min(...metrics.durations);
  const maxDuration = Math.max(...metrics.durations);
  
  const totalCacheRequests = metrics.cacheHits + metrics.cacheMisses;
  const cacheHitRate = totalCacheRequests > 0 
    ? (metrics.cacheHits / totalCacheRequests) * 100 
    : 0;

  return {
    route,
    totalRequests,
    avgDuration: Math.round(avgDuration),
    minDuration,
    maxDuration,
    cacheHitRate: Math.round(cacheHitRate * 10) / 10,
    p50: percentile(metrics.durations, 50),
    p95: percentile(metrics.durations, 95),
    p99: percentile(metrics.durations, 99),
    lastHour,
  };
}

/**
 * Get all route statistics
 */
export function getAllStats(): PerformanceStats[] {
  const stats: PerformanceStats[] = [];
  
  for (const route of metricsStore.keys()) {
    const routeStats = getRouteStats(route);
    if (routeStats) {
      stats.push(routeStats);
    }
  }

  // Sort by total requests (most popular first)
  return stats.sort((a, b) => b.totalRequests - a.totalRequests);
}

/**
 * Clean up old metrics (called periodically)
 */
export function cleanupOldMetrics(): number {
  const now = Date.now();
  const cutoff = now - METRICS_RETENTION_MS;
  let cleaned = 0;

  for (const [route, metrics] of metricsStore.entries()) {
    const validIndices: number[] = [];
    
    metrics.timestamps.forEach((ts, index) => {
      if (ts > cutoff) {
        validIndices.push(index);
      } else {
        cleaned++;
      }
    });

    if (validIndices.length === 0) {
      metricsStore.delete(route);
    } else if (validIndices.length < metrics.timestamps.length) {
      metrics.durations = validIndices.map(i => metrics.durations[i]);
      metrics.timestamps = validIndices.map(i => metrics.timestamps[i]);
    }
  }

  if (cleaned > 0) {
    logger.info('Cleaned up old metrics', { count: cleaned });
  }

  return cleaned;
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  metricsStore.clear();
}

/**
 * Timer utility for measuring operations
 */
export class PerformanceTimer {
  private startTime: number;
  private route: string;
  private method: string;
  private cacheHit?: boolean;

  constructor(route: string, method = 'GET') {
    this.startTime = Date.now();
    this.route = route;
    this.method = method;
  }

  setCacheHit(hit: boolean): void {
    this.cacheHit = hit;
  }

  end(statusCode?: number): number {
    const duration = Date.now() - this.startTime;
    
    trackPerformance({
      route: this.route,
      method: this.method,
      duration,
      timestamp: this.startTime,
      cacheHit: this.cacheHit,
      statusCode,
    });

    return duration;
  }
}

// Cleanup old metrics every hour
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(() => {
    cleanupOldMetrics();
  }, 60 * 60 * 1000);
}

