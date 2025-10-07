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

const FRIENDS_PER_PAGE = 48; // 6 rows of 8

export function TopFollowers({ userId }: TopFollowersProps) {
  const [friends, setFriends] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalFollowings, setTotalFollowings] = useState<number | null>(null);
  const [currentLimit, setCurrentLimit] = useState(FRIENDS_PER_PAGE);

  const fetchFriends = useCallback(async (limit: number, startFrom: number = 0) => {
    try {
      const isInitial = startFrom === 0;
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/soundcloud/friends?userId=${userId}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let friendsReceived = 0;
      let buffer = ''; // Buffer for incomplete lines

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Split by newlines but keep the last incomplete line in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const message = JSON.parse(line);
            
            if (message.type === 'friend') {
              friendsReceived++;
              // Only add friends after startFrom index
              if (friendsReceived > startFrom) {
                setFriends(prev => {
                  // Prevent duplicates
                  if (prev.some(f => f.id === message.data.id)) {
                    return prev;
                  }
                  return [...prev, message.data];
                });
              }
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
      
      // Process any remaining buffered data
      if (buffer.trim()) {
        try {
          const message = JSON.parse(buffer);
          if (message.type === 'complete') {
            setHasMore(message.data.hasMore);
            setTotalFollowings(message.data.totalFollowings);
          }
        } catch (parseError) {
          console.error('Error parsing final buffer:', parseError);
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
    setCurrentLimit(FRIENDS_PER_PAGE);
    fetchFriends(FRIENDS_PER_PAGE, 0);
  }, [userId, fetchFriends]);

  const loadMore = () => {
    const newLimit = currentLimit + FRIENDS_PER_PAGE;
    setCurrentLimit(newLimit);
    fetchFriends(newLimit, friends.length);
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
      <h3 className="text-sm font-medium text-zinc-400">Friends</h3>
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

