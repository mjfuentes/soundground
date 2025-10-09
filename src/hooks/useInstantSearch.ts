/**
 * Hook for instant search with client-side caching and background refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ClientSearchCache } from '@/lib/client-search-cache';
import { measureAsync } from '@/lib/client-performance';
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from '@/lib/soundcloud/client';

type SearchResult = SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist;

interface UseInstantSearchOptions {
  debounceMs?: number;
  onImmediate?: boolean; // Show cached results immediately while fetching fresh data
}

export function useInstantSearch(options: UseInstantSearchOptions = {}) {
  const { debounceMs = 300, onImmediate = true } = options;
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFreshLoading, setIsFreshLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const search = useCallback(async (query: string, immediate = false) => {
    // Clear previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setIsFreshLoading(false);
      return;
    }

    // Check cache first
    const cached = ClientSearchCache.get(query);
    
    if (cached && onImmediate) {
      // Show cached results immediately
      setResults(cached);
      setIsLoading(false);
      setIsFreshLoading(true); // Still fetching fresh data
    } else if (!cached) {
      setIsLoading(true);
    }

    // Set up new search
    const performSearch = async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const freshResults = await measureAsync(
          'search',
          query,
          async () => {
            const response = await fetch(
              `/api/search?q=${encodeURIComponent(query)}&limit=20`,
              { signal: controller.signal }
            );
            
            if (!response.ok) {
              throw new Error('Search failed');
            }
            
            const data = await response.json();
            return data.collection || [];
          },
          { query, cached: !!cached }
        );

        // Update cache
        ClientSearchCache.set(query, freshResults);

        // Check if results actually changed
        if (!cached || ClientSearchCache.areResultsDifferent(cached, freshResults)) {
          setResults(freshResults);
        }

        setIsLoading(false);
        setIsFreshLoading(false);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        
        console.error('Search error:', error);
        
        // If we have cached results, keep showing them
        if (!cached) {
          setResults([]);
        }
        
        setIsLoading(false);
        setIsFreshLoading(false);
      }
    };

    // Execute search with debounce (unless immediate is requested)
    if (immediate || !debounceMs) {
      performSearch();
    } else {
      debounceTimerRef.current = setTimeout(performSearch, debounceMs);
    }
  }, [debounceMs, onImmediate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    results,
    isLoading,
    isFreshLoading, // Indicates background refresh
    search,
  };
}

