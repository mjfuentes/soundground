"use client";

import { useState, useEffect, useCallback } from "react";
import { FollowerCard } from "./follower-card";

interface Follower {
  id: number;
  permalink: string;
  username: string;
  avatar_url?: string;
  followers_count: number;
  track_count?: number;
}

interface TopFollowersProps {
  userId: number;
}

export function TopFollowers({ userId }: TopFollowersProps) {
  const [friends, setFriends] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalFollowings, setTotalFollowings] = useState<number | null>(null);

  const fetchFriends = useCallback(async (currentLimit: number) => {
    try {
      const isInitial = currentLimit === 48;
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/soundcloud/friends?userId=${userId}&limit=${currentLimit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      const newFriends: Follower[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const message = JSON.parse(line);
            
            if (message.type === 'friend') {
              newFriends.push(message.data);
              // Update state immediately as each friend arrives
              setFriends(prev => {
                // Avoid duplicates
                if (prev.some(f => f.id === message.data.id)) {
                  return prev;
                }
                return [...prev, message.data];
              });
            } else if (message.type === 'complete') {
              setHasMore(message.data.hasMore);
              setTotalFollowings(message.data.totalFollowings);
            } else if (message.type === 'error') {
              throw new Error(message.data.message);
            }
          } catch (parseError) {
            console.error('Error parsing message:', parseError);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    setFriends([]);
    fetchFriends(48);
  }, [userId, fetchFriends]);

  const loadMore = () => {
    const newLimit = friends.length + 48;
    setFriends([]); // Clear to avoid duplicates
    fetchFriends(newLimit);
  };

  if (loading && friends.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-400">Friends</h3>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
        <p className="text-xs text-zinc-500">Loading friends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-400">Friends</h3>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (friends.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Friends</h3>
        {totalFollowings !== null && (
          <span className="text-xs text-zinc-500">
            {friends.length} mutual follows
          </span>
        )}
      </div>
      <div className="grid grid-cols-8 gap-2">
        {friends.map((follower) => (
          <FollowerCard key={follower.id} follower={follower} />
        ))}
        {loading && friends.length > 0 && (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`loading-${i}`} className="aspect-square animate-pulse rounded-lg bg-zinc-800" />
          ))
        )}
      </div>
      {hasMore && !loading && !loadingMore && (
        <button
          onClick={loadMore}
          className="self-start text-xs text-amber-400 transition hover:text-amber-300"
        >
          ...more
        </button>
      )}
      {loadingMore && (
        <p className="text-xs text-zinc-500">Loading more friends...</p>
      )}
    </div>
  );
}

