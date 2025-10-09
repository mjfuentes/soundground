import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from '@/types';

type SearchResult = SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist;

interface SearchHistory {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

// Store recent searches in memory (on server)
const searchHistory: SearchHistory[] = [];
const MAX_HISTORY = 50;
const HISTORY_TTL = 60000; // 1 minute

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Check if a result matches the query (fuzzy)
 */
function resultMatchesQuery(result: SearchResult, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Get searchable text from result
  let title = '';
  let username = '';
  
  if ('username' in result) {
    username = result.username || '';
    title = result.full_name || '';
  } else if ('title' in result) {
    title = result.title || '';
    if ('user' in result && result.user) {
      username = result.user.username || '';
    }
  }
  
  // Exact substring match
  if (title.toLowerCase().includes(lowerQuery) || username.toLowerCase().includes(lowerQuery)) {
    return true;
  }
  
  // Fuzzy match (70% similarity threshold)
  const titleSimilarity = stringSimilarity(lowerQuery, title);
  const usernameSimilarity = stringSimilarity(lowerQuery, username);
  
  return titleSimilarity > 0.7 || usernameSimilarity > 0.7;
}

/**
 * Score a result based on relevance to query
 */
function scoreResult(result: SearchResult, query: string): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;
  
  let title = '';
  let username = '';
  
  if ('username' in result) {
    username = result.username || '';
    title = result.full_name || '';
  } else if ('title' in result) {
    title = result.title || '';
    if ('user' in result && result.user) {
      username = result.user.username || '';
    }
  }
  
  const lowerTitle = title.toLowerCase();
  const lowerUsername = username.toLowerCase();
  
  // Exact match at start = highest score
  if (lowerTitle.startsWith(lowerQuery)) score += 100;
  if (lowerUsername.startsWith(lowerQuery)) score += 100;
  
  // Exact match anywhere
  if (lowerTitle.includes(lowerQuery)) score += 50;
  if (lowerUsername.includes(lowerQuery)) score += 50;
  
  // Fuzzy similarity
  score += stringSimilarity(lowerQuery, lowerTitle) * 30;
  score += stringSimilarity(lowerQuery, lowerUsername) * 30;
  
  // Boost by popularity
  if ('followers_count' in result && result.followers_count) {
    score += Math.log10(result.followers_count + 1) * 5;
  }
  if ('likes_count' in result && result.likes_count) {
    score += Math.log10(result.likes_count + 1) * 2;
  }
  if ('playback_count' in result && result.playback_count) {
    score += Math.log10(result.playback_count + 1) * 2;
  }
  
  return score;
}

/**
 * Add search to history
 */
function addToHistory(query: string, results: SearchResult[]): void {
  // Clean old entries
  const now = Date.now();
  const validHistory = searchHistory.filter(h => now - h.timestamp < HISTORY_TTL);
  
  // Add new entry
  validHistory.push({
    query,
    results,
    timestamp: now
  });
  
  // Keep only recent entries
  searchHistory.length = 0;
  searchHistory.push(...validHistory.slice(-MAX_HISTORY));
}

/**
 * Get results from similar recent searches
 */
function getHistoricalResults(query: string): SearchResult[] {
  const now = Date.now();
  const relevantHistory = searchHistory.filter(h => {
    const isRecent = now - h.timestamp < HISTORY_TTL;
    const isSimilar = query.startsWith(h.query) || h.query.startsWith(query);
    return isRecent && isSimilar;
  });
  
  // Merge all historical results
  const allResults: SearchResult[] = [];
  for (const history of relevantHistory) {
    allResults.push(...history.results);
  }
  
  return allResults;
}

/**
 * Deduplicate results by ID
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<number>();
  const unique: SearchResult[] = [];
  
  for (const result of results) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      unique.push(result);
    }
  }
  
  return unique;
}

/**
 * Stabilize search results by merging with historical data
 */
export function stabilizeSearchResults(
  query: string,
  newResults: SearchResult[]
): SearchResult[] {
  // Get historical results from similar queries
  const historicalResults = getHistoricalResults(query);
  
  // Merge new and historical results
  const allResults = [...newResults, ...historicalResults];
  
  // Deduplicate
  const uniqueResults = deduplicateResults(allResults);
  
  // Filter to only results that match current query
  const relevantResults = uniqueResults.filter(r => resultMatchesQuery(r, query));
  
  // Score and sort by relevance
  const scoredResults = relevantResults.map(result => ({
    result,
    score: scoreResult(result, query)
  }));
  
  scoredResults.sort((a, b) => b.score - a.score);
  
  // Take top results
  const finalResults = scoredResults.slice(0, 20).map(s => s.result);
  
  // Store in history for future queries
  addToHistory(query, newResults);
  
  return finalResults;
}

/**
 * Clear search history (useful for testing)
 */
export function clearSearchHistory(): void {
  searchHistory.length = 0;
}

