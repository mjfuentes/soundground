/**
 * Client-side performance monitoring
 */

export interface ClientPerformanceMetric {
  type: 'navigation' | 'search' | 'api' | 'interaction';
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceSummary {
  type: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}

// In-memory store for client metrics
const metrics: ClientPerformanceMetric[] = [];
const MAX_METRICS = 500; // Keep last 500 metrics

/**
 * Track a client-side performance metric
 */
export function trackClientMetric(metric: Omit<ClientPerformanceMetric, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  const fullMetric: ClientPerformanceMetric = {
    ...metric,
    timestamp: Date.now(),
  };

  metrics.push(fullMetric);

  // Keep only recent metrics
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log slow operations
  if (metric.duration > 500) {
    console.warn(`Slow ${metric.type}: ${metric.name} took ${metric.duration}ms`, metric.metadata);
  }
}

/**
 * Get performance summary by type
 */
export function getPerformanceSummary(): PerformanceSummary[] {
  if (typeof window === 'undefined') return [];

  const summaries = new Map<string, number[]>();

  metrics.forEach(metric => {
    const key = `${metric.type}:${metric.name}`;
    if (!summaries.has(key)) {
      summaries.set(key, []);
    }
    summaries.get(key)!.push(metric.duration);
  });

  return Array.from(summaries.entries()).map(([key, durations]) => ({
    type: key,
    count: durations.length,
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
  }));
}

/**
 * Measure and track a function execution
 */
export async function measureAsync<T>(
  type: ClientPerformanceMetric['type'],
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    trackClientMetric({ type, name, duration, metadata });
  }
}

/**
 * Measure and track a synchronous function execution
 */
export function measureSync<T>(
  type: ClientPerformanceMetric['type'],
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    trackClientMetric({ type, name, duration, metadata });
  }
}

/**
 * Create a timer for manual measurement
 */
export class ClientPerformanceTimer {
  private startTime: number;
  private type: ClientPerformanceMetric['type'];
  private name: string;
  private metadata?: Record<string, unknown>;

  constructor(
    type: ClientPerformanceMetric['type'],
    name: string,
    metadata?: Record<string, unknown>
  ) {
    this.startTime = performance.now();
    this.type = type;
    this.name = name;
    this.metadata = metadata;
  }

  end(additionalMetadata?: Record<string, unknown>): number {
    const duration = performance.now() - this.startTime;
    trackClientMetric({
      type: this.type,
      name: this.name,
      duration,
      metadata: { ...this.metadata, ...additionalMetadata },
    });
    return duration;
  }
}

/**
 * Track navigation performance using Navigation Timing API
 */
export function trackPageLoad(): void {
  if (typeof window === 'undefined' || !window.performance) return;

  // Wait for page to fully load
  if (document.readyState === 'complete') {
    recordPageMetrics();
  } else {
    window.addEventListener('load', recordPageMetrics);
  }
}

function recordPageMetrics(): void {
  const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (!perfData) return;

  // DNS lookup time
  if (perfData.domainLookupEnd && perfData.domainLookupStart) {
    trackClientMetric({
      type: 'navigation',
      name: 'dns-lookup',
      duration: perfData.domainLookupEnd - perfData.domainLookupStart,
    });
  }

  // Connection time
  if (perfData.connectEnd && perfData.connectStart) {
    trackClientMetric({
      type: 'navigation',
      name: 'connection',
      duration: perfData.connectEnd - perfData.connectStart,
    });
  }

  // Time to first byte
  if (perfData.responseStart && perfData.requestStart) {
    trackClientMetric({
      type: 'navigation',
      name: 'ttfb',
      duration: perfData.responseStart - perfData.requestStart,
    });
  }

  // DOM processing
  if (perfData.domComplete && perfData.domInteractive) {
    trackClientMetric({
      type: 'navigation',
      name: 'dom-processing',
      duration: perfData.domComplete - perfData.domInteractive,
    });
  }

  // Total page load time
  if (perfData.loadEventEnd && perfData.fetchStart) {
    trackClientMetric({
      type: 'navigation',
      name: 'page-load',
      duration: perfData.loadEventEnd - perfData.fetchStart,
    });
  }
}

/**
 * Get all metrics for debugging
 */
export function getAllClientMetrics(): ClientPerformanceMetric[] {
  return [...metrics];
}

/**
 * Clear all metrics
 */
export function clearClientMetrics(): void {
  metrics.length = 0;
}

