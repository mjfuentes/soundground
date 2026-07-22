"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchDropdown } from "@/components/search-dropdown";
import { ClientSearchCache } from "@/lib/client-search-cache";
import {
  isPlaylist,
  isQualityResult,
  isTrack,
  isUser,
  sortSearchResults,
  type SearchResult,
} from "@/lib/search-results";

const MAX_RESULTS = 5;
const DEBOUNCE_MS = 300;
const MAX_QUICK_JUMPS = 4;

interface BrowseIndexEntry {
  kind: "genre" | "city" | "scene";
  slug: string;
  name: string;
}

function quickJumpMatches(index: readonly BrowseIndexEntry[], query: string): BrowseIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts = index.filter((e) => e.name.toLowerCase().startsWith(q));
  const contains = index.filter(
    (e) => !e.name.toLowerCase().startsWith(q) && e.name.toLowerCase().includes(q),
  );
  return [...starts, ...contains].slice(0, MAX_QUICK_JUMPS);
}

/**
 * Search band for the browse-first home: an artist search that jumps you
 * into context, styled per the redesign, backed by the existing search API.
 */
export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const [browseIndex, setBrowseIndex] = useState<BrowseIndexEntry[]>([]);
  const indexRequested = useRef(false);

  const ensureBrowseIndex = useCallback(() => {
    if (indexRequested.current) return;
    indexRequested.current = true;
    fetch("/api/browse/index")
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => setBrowseIndex(Array.isArray(data.entries) ? data.entries : []))
      .catch(() => undefined); // quick-jumps are progressive enhancement
  }, []);

  const visibleResults = useMemo(
    () => sortSearchResults(results.filter(isQualityResult)).slice(0, MAX_RESULTS),
    [results],
  );

  const fetchResults = useCallback(async (searchQuery: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      const data = await response.json();
      const fresh: SearchResult[] = data.collection || [];
      ClientSearchCache.set(searchQuery, fresh);
      setResults(fresh);
      setIsSearching(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Search error:", error);
      setIsSearching(false);
    }
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(0);
      clearTimeout(debounceRef.current);
      ensureBrowseIndex();

      const trimmed = value.trim();
      if (!trimmed) {
        abortRef.current?.abort();
        setResults([]);
        setIsDropdownOpen(false);
        setIsSearching(false);
        return;
      }

      setIsDropdownOpen(true);
      const cached = ClientSearchCache.get(trimmed);
      if (cached) {
        setResults(cached);
      }
      debounceRef.current = setTimeout(() => fetchResults(trimmed), DEBOUNCE_MS);
    },
    [fetchResults, ensureBrowseIndex],
  );

  const navigateTo = useCallback(
    (result: SearchResult) => {
      if (isUser(result)) {
        const handle = result.permalink || result.permalink_url?.split("/").pop();
        if (handle) router.push(`/${handle}`);
      } else if (isTrack(result)) {
        router.push(`/track/${result.id}`);
      } else if (isPlaylist(result)) {
        router.push(`/playlist/${result.id}`);
      }
      setIsDropdownOpen(false);
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (visibleResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = visibleResults[selectedIndex];
        if (selected) navigateTo(selected);
      }
    },
    [visibleResults, selectedIndex, navigateTo],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="border-b border-sg-line px-5 py-4 sm:px-7">
      <div className="relative" ref={containerRef}>
        <div
          className={`flex items-center gap-3 border bg-sg-surface px-[15px] py-[13px] transition-colors ${
            isSearching ? "border-sg-line-bold" : "border-sg-line-strong focus-within:border-sg-line-bold"
          }`}
        >
          <span aria-hidden className="font-sg-mono text-[13px] text-sg-faint">
            ⌕
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search an artist, genre, or city…"
            aria-label="Search an artist, genre, or city"
            autoComplete="off"
            spellCheck="false"
            className="flex-1 bg-transparent font-sg text-[15px] text-sg-ink caret-sg-ink placeholder:text-sg-faint focus:outline-none"
          />
          {isSearching && query ? (
            <span className="h-3 w-3 flex-none animate-spin rounded-full border-2 border-sg-faint border-t-sg-muted" />
          ) : (
            <span className="hidden flex-none font-sg-mono text-[10px] tracking-[0.1em] text-sg-ghost sm:block">
              ↵ JUMP TO CONTEXT
            </span>
          )}
        </div>
        {isDropdownOpen && quickJumpMatches(browseIndex, query).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 border border-sg-line bg-sg-raised px-3 py-2.5">
            {quickJumpMatches(browseIndex, query).map((entry) => (
              <Link
                key={`${entry.kind}:${entry.slug}`}
                href={`/${entry.kind}/${entry.slug}`}
                onClick={() => setIsDropdownOpen(false)}
                className="border border-sg-line-strong px-2.5 py-1.5 font-sg-mono text-[10.5px] text-sg-soft transition-colors hover:border-sg-ink hover:text-white"
              >
                <span className="mr-1.5 uppercase tracking-[0.08em] text-sg-faint">
                  {entry.kind}
                </span>
                {entry.name}
              </Link>
            ))}
          </div>
        )}
        {isDropdownOpen && (
          <SearchDropdown
            results={results}
            isLoading={isSearching}
            query={query}
            onClose={() => setIsDropdownOpen(false)}
            selectedIndex={selectedIndex}
            containerRef={containerRef}
            isMobile={true}
          />
        )}
      </div>
      <div className="mt-2 font-sg-mono text-[10.5px] tracking-[0.04em] text-sg-ghost">
        Search an artist → land in their genre &amp; city. A shortcut, not the map.
      </div>
    </div>
  );
}
