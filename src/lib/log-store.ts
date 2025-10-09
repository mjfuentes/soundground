/**
 * In-memory log store for admin dashboard
 * 
 * Stores recent logs for viewing in the admin panel.
 * This is a simple in-memory implementation that will clear on server restart.
 */

export interface StoredLog {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
}

const MAX_LOGS = 1000; // Keep last 1000 logs
const logs: StoredLog[] = [];

/**
 * Add a log entry to the store
 */
export function addLog(log: StoredLog): void {
  logs.push(log);
  
  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

/**
 * Get recent logs
 */
export function getRecentLogs(limit = 100): StoredLog[] {
  return logs.slice(-limit).reverse(); // Most recent first
}

/**
 * Clear all logs (for testing)
 */
export function clearLogs(): void {
  logs.length = 0;
}

