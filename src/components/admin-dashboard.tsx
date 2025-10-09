'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CacheStats {
  type: string;
  hit_count: number;
  miss_count: number;
  last_accessed: number;
}

interface SystemMetrics {
  totalRequests: number;
  cacheHitRate: number;
  uptime: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'cache' | 'changelog'>('overview');
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [changelog, setChangelog] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Refresh data every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch cache stats
      const cacheRes = await fetch('/api/admin/cache-stats');
      if (cacheRes.ok) {
        const data = await cacheRes.json();
        setCacheStats(data.stats || []);
      }

      // Fetch system metrics
      const metricsRes = await fetch('/api/admin/metrics');
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      // Fetch recent logs
      const logsRes = await fetch('/api/admin/logs');
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }

      // Fetch changelog
      const changelogRes = await fetch('/api/admin/changelog');
      if (changelogRes.ok) {
        const data = await changelogRes.json();
        setChangelog(data.content);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setLoading(false);
    }
  };

  const calculateHitRate = (stats: CacheStats[]) => {
    const totals = stats.reduce(
      (acc, stat) => ({
        hits: acc.hits + stat.hit_count,
        misses: acc.misses + stat.miss_count,
      }),
      { hits: 0, misses: 0 }
    );
    const total = totals.hits + totals.misses;
    return total > 0 ? ((totals.hits / total) * 100).toFixed(1) : '0';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400">SoundGround System Monitoring</p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20"
        >
          ← Back to App
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-white/10">
        {['overview', 'logs', 'cache', 'changelog'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${
              activeTab === tab
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white/5 p-6">
              <div className="text-sm text-gray-400">Total Requests</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {metrics?.totalRequests?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-6">
              <div className="text-sm text-gray-400">Cache Hit Rate</div>
              <div className="mt-2 text-3xl font-bold text-green-400">
                {calculateHitRate(cacheStats)}%
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-6">
              <div className="text-sm text-gray-400">Uptime</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {metrics?.uptime || 'N/A'}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-lg bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Cache Performance by Type</h2>
            <div className="space-y-3">
              {cacheStats.map((stat) => (
                <div key={stat.type} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white capitalize">{stat.type}</div>
                    <div className="text-xs text-gray-400">
                      {stat.hit_count} hits / {stat.miss_count} misses
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">
                      {stat.hit_count + stat.miss_count > 0
                        ? ((stat.hit_count / (stat.hit_count + stat.miss_count)) * 100).toFixed(1)
                        : '0'}
                      %
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Logs Preview */}
          <div className="rounded-lg bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Recent Activity</h2>
            <div className="space-y-2">
              {logs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                  <span className={`font-medium ${getLogLevelColor(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="flex-1 text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveTab('logs')}
              className="mt-4 text-sm text-purple-400 hover:text-purple-300"
            >
              View all logs →
            </button>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="rounded-lg bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">System Logs</h2>
            <button
              onClick={fetchData}
              className="rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
            >
              Refresh
            </button>
          </div>
          <div className="max-h-[600px] space-y-2 overflow-y-auto font-mono text-sm">
            {logs.map((log, idx) => (
              <div key={idx} className="rounded bg-black/30 p-3">
                <div className="flex items-start gap-3">
                  <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                  <span className={`font-bold ${getLogLevelColor(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="flex-1 text-gray-200">{log.message}</span>
                </div>
                {log.context && Object.keys(log.context).length > 0 && (
                  <pre className="mt-2 text-xs text-gray-400">
                    {JSON.stringify(log.context, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-gray-400">No logs available</div>
            )}
          </div>
        </div>
      )}

      {/* Cache Tab */}
      {activeTab === 'cache' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white/5 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Cache Statistics</h2>
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to clear all cache?')) {
                    await fetch('/api/cache', { method: 'DELETE' });
                    fetchData();
                  }
                }}
                className="rounded bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30"
              >
                Clear Cache
              </button>
            </div>

            <div className="space-y-4">
              {cacheStats.map((stat) => {
                const total = stat.hit_count + stat.miss_count;
                const hitRate = total > 0 ? (stat.hit_count / total) * 100 : 0;

                return (
                  <div key={stat.type} className="rounded-lg bg-black/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white capitalize">{stat.type}</h3>
                      <span className="text-2xl font-bold text-green-400">
                        {hitRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mb-2 h-2 w-full rounded-full bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${hitRate}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Hits</div>
                        <div className="font-bold text-green-400">{stat.hit_count}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Misses</div>
                        <div className="font-bold text-red-400">{stat.miss_count}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total</div>
                        <div className="font-bold text-white">{total}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Changelog Tab */}
      {activeTab === 'changelog' && (
        <div className="rounded-lg bg-white/5 p-6">
          <h2 className="mb-4 text-xl font-bold text-white">Changelog</h2>
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-300">{changelog}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

