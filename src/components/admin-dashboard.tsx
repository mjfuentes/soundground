'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [cacheRes, metricsRes, logsRes, changelogRes] = await Promise.all([
        fetch('/api/admin/cache-stats'),
        fetch('/api/admin/metrics'),
        fetch('/api/admin/logs'),
        fetch('/api/admin/changelog'),
      ]);

      if (cacheRes.ok) {
        const data = await cacheRes.json();
        setCacheStats(data.stats || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }

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
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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
        return 'text-gray-300';
    }
  };

  const getCacheTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'general': 'General',
      'soundcloud:profile': 'Profiles',
      'soundcloud:tracks': 'Tracks',
      'soundcloud:playlists': 'Playlists',
      'soundcloud:albums': 'Albums',
      'soundcloud:followers': 'Followers',
      'soundcloud:spotlight': 'Spotlight',
      'soundcloud:search': 'Search',
      'followings_set': 'Followings',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 text-white overflow-y-auto" style={{ backgroundColor: '#000000' }}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-400">System monitoring and statistics</p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium transition hover:border-gray-600 hover:bg-gray-800"
          >
            Back to App
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 border-b border-gray-800">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'cache', label: 'Cache' },
            { id: 'logs', label: 'Logs' },
            { id: 'changelog', label: 'Changelog' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-white text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Total Requests</div>
                <div className="text-3xl font-bold tabular-nums">{metrics?.totalRequests?.toLocaleString() || '0'}</div>
                <div className="mt-1 text-xs text-gray-500">Since server start</div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Cache Hit Rate</div>
                <div className="text-3xl font-bold tabular-nums text-green-400">{calculateHitRate(cacheStats)}%</div>
                <div className="mt-1 text-xs text-gray-500">
                  {Number(calculateHitRate(cacheStats)) >= 80 ? 'Excellent' : Number(calculateHitRate(cacheStats)) >= 50 ? 'Good' : 'Needs improvement'}
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Server Uptime</div>
                <div className="text-3xl font-bold tabular-nums">{metrics?.uptime || 'N/A'}</div>
                <div className="mt-1 text-xs text-gray-500">Running time</div>
              </div>
            </div>

            {/* Cache Performance Summary */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Cache Performance</h2>
              <div className="space-y-3">
                {cacheStats.slice(0, 5).map((stat) => {
                  const total = stat.hit_count + stat.miss_count;
                  const hitRate = total > 0 ? (stat.hit_count / total) * 100 : 0;

                  return (
                    <div key={stat.type} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">{getCacheTypeLabel(stat.type)}</div>
                        <div className="text-sm font-mono tabular-nums text-gray-400">{hitRate.toFixed(1)}%</div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full bg-white transition-all duration-500"
                          style={{ width: `${hitRate}%` }}
                        />
                      </div>
                      <div className="mt-2 flex gap-6 text-xs text-gray-500">
                        <div>
                          <span className="font-mono tabular-nums text-green-400">{stat.hit_count.toLocaleString()}</span> hits
                        </div>
                        <div>
                          <span className="font-mono tabular-nums text-red-400">{stat.miss_count.toLocaleString()}</span> misses
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Logs */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
              {logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.slice(0, 5).map((log, idx) => (
                    <div key={idx} className="flex items-start gap-4 rounded-lg border border-gray-800 bg-gray-900 p-3 font-mono text-xs">
                      <span className={`${getLogLevelColor(log.level)}`}>{log.level.toUpperCase().padEnd(5)}</span>
                      <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                      <span className="flex-1 text-gray-300">{log.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-sm text-gray-500">
                  No logs available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cache Tab */}
        {activeTab === 'cache' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Cache Statistics</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Hit rate shows how often data is served from cache vs fetched from API
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (confirm('Clear all cached data?')) {
                      await fetch('/api/cache', { method: 'DELETE' });
                      fetchData();
                    }
                  }}
                  className="rounded-lg border border-red-900 bg-red-950 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-900"
                >
                  Clear Cache
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Reset cache statistics counters?')) {
                      await fetch('/api/admin/cache-stats/reset', { method: 'POST' });
                      fetchData();
                    }
                  }}
                  className="rounded-lg border border-yellow-900 bg-yellow-950 px-4 py-2 text-sm font-medium text-yellow-400 transition hover:bg-yellow-900"
                >
                  Reset Stats
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {cacheStats.map((stat) => {
                const total = stat.hit_count + stat.miss_count;
                const hitRate = total > 0 ? (stat.hit_count / total) * 100 : 0;

                return (
                  <div key={stat.type} className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold">{getCacheTypeLabel(stat.type)}</h3>
                      <div className="text-2xl font-bold tabular-nums">{hitRate.toFixed(1)}%</div>
                    </div>

                    <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${hitRate}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded border border-green-900 bg-green-950 p-3 text-center">
                        <div className="text-xs text-gray-400">Hits</div>
                        <div className="mt-1 font-mono text-xl font-bold tabular-nums text-green-400">
                          {stat.hit_count.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded border border-red-900 bg-red-950 p-3 text-center">
                        <div className="text-xs text-gray-400">Misses</div>
                        <div className="mt-1 font-mono text-xl font-bold tabular-nums text-red-400">
                          {stat.miss_count.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-800 p-3 text-center">
                        <div className="text-xs text-gray-400">Total</div>
                        <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                          {total.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">System Logs</h2>
                <p className="mt-1 text-sm text-gray-400">Real-time application activity</p>
              </div>
              <button
                onClick={fetchData}
                className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium transition hover:border-gray-600 hover:bg-gray-800"
              >
                Refresh
              </button>
            </div>

            {logs.length > 0 ? (
              <div className="max-h-[700px] space-y-2 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-800 bg-gray-900 p-4 font-mono text-sm">
                    <div className="mb-2 flex items-start gap-4">
                      <span className={`${getLogLevelColor(log.level)}`}>{log.level.toUpperCase().padEnd(5)}</span>
                      <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <div className="ml-20 text-gray-300">{log.message}</div>
                    {log.context && Object.keys(log.context).length > 0 && (
                      <pre className="ml-20 mt-2 overflow-x-auto rounded bg-black p-2 text-xs text-gray-400">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center text-sm text-gray-500">
                No logs available yet
              </div>
            )}
          </div>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div>
            <h2 className="mb-6 text-lg font-semibold">Changelog</h2>
            <div className="prose prose-invert max-w-none rounded-lg border border-gray-800 bg-gray-900 p-6">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="mb-4 mt-0 text-2xl font-bold text-white" {...props} />,
                  h2: ({ ...props }) => <h2 className="mb-3 mt-8 text-xl font-bold text-white" {...props} />,
                  h3: ({ ...props }) => <h3 className="mb-2 mt-6 text-base font-semibold text-gray-300" {...props} />,
                  p: ({ ...props }) => <p className="mb-4 text-sm leading-relaxed text-gray-400" {...props} />,
                  ul: ({ ...props }) => <ul className="mb-4 ml-6 list-disc space-y-1 text-sm text-gray-400" {...props} />,
                  ol: ({ ...props }) => <ol className="mb-4 ml-6 list-decimal space-y-1 text-sm text-gray-400" {...props} />,
                  li: ({ ...props }) => <li className="text-gray-400" {...props} />,
                  a: ({ ...props }) => (
                    <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  code: ({ ...props }) => <code className="rounded bg-black px-1.5 py-0.5 text-sm text-gray-300" {...props} />,
                  pre: ({ ...props }) => (
                    <pre className="mb-4 overflow-x-auto rounded bg-black p-4 text-sm text-gray-300" {...props} />
                  ),
                  blockquote: ({ ...props }) => (
                    <blockquote className="border-l-4 border-gray-700 pl-4 italic text-gray-500" {...props} />
                  ),
                }}
              >
                {changelog}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
