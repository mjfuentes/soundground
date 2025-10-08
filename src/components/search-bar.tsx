"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SearchBarProps {
  onSearch: (query: string, isImmediate?: boolean) => void;
  debounceMs?: number;
  isLoading?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function SearchBar({ 
  onSearch, 
  debounceMs = 300,
  isLoading = false,
  onKeyDown
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Call onSearch when debounced query changes (actual search)
  useEffect(() => {
    if (debouncedQuery.trim()) {
      onSearch(debouncedQuery.trim(), false);
    } else if (debouncedQuery === "") {
      onSearch("", false);
    }
  }, [debouncedQuery, onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // If clearing the input, notify immediately (no debounce)
    if (newValue.trim() === "") {
      onSearch("", true);
      setDebouncedQuery("");
    } else {
      // Immediately show loading state when user starts typing
      onSearch(newValue.trim(), true);
    }
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    onSearch("", true); // Immediately notify parent that search is cleared
    inputRef.current?.focus();
  }, [onSearch]);

  return (
    <div className="relative w-full">
      <div className="relative">
        {/* Custom placeholder with emphasized "artist" */}
        {!query && (
          <div className="absolute inset-0 flex items-center pl-3 pointer-events-none">
            <span className="text-xs text-zinc-500">
              search{" "}
              <span className="text-sm font-semibold text-zinc-400">artist</span>
              {" "}tracks albums
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          className={`w-full py-2 px-3 text-sm bg-transparent border rounded-md text-white caret-white focus:outline-none transition-all duration-200 ${
            isLoading 
              ? 'border-zinc-600 animate-pulse' 
              : 'border-zinc-700 focus:border-zinc-500'
          }`}
          aria-label="Search"
          autoComplete="off"
          spellCheck="false"
        />
        {isLoading && query ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="h-3 w-3 rounded-full border-2 border-zinc-600 border-t-zinc-400 animate-spin"></div>
          </div>
        ) : query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

