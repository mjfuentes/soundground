/**
 * Request tracking for admin dashboard metrics
 */

interface RequestMetrics {
  totalRequests: number;
  startTime: number;
}

// In-memory metrics (resets on server restart)
const metrics: RequestMetrics = {
  totalRequests: 0,
  startTime: Date.now(),
};

/**
 * Increment request counter
 */
export function trackRequest(): void {
  metrics.totalRequests++;
}

/**
 * Get current metrics
 */
export function getRequestMetrics(): RequestMetrics {
  return {
    ...metrics,
  };
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics(): void {
  metrics.totalRequests = 0;
  metrics.startTime = Date.now();
}

