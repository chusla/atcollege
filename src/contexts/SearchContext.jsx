import React, { createContext, useContext, useState, useCallback } from 'react';

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  // Store search results keyed by query string
  const [searchCache, setSearchCache] = useState({});

  // Save search results
  const cacheSearch = useCallback((query, radius, category, results) => {
    const cacheKey = `${query.toLowerCase()}_${radius}_${category}`;
    setSearchCache(prev => ({
      ...prev,
      [cacheKey]: {
        query,
        radius,
        category,
        results,
        timestamp: Date.now(),
        // Cache expires after 5 minutes
        expiresAt: Date.now() + 5 * 60 * 1000
      }
    }));
    console.log('📦 [SEARCH CACHE] Saved results for:', cacheKey, results.places?.length || 0, 'places');
  }, []);

  // Get cached search results
  const getCachedSearch = useCallback((query, radius, category) => {
    const cacheKey = `${query.toLowerCase()}_${radius}_${category}`;
    const cached = searchCache[cacheKey];
    
    if (cached && Date.now() < cached.expiresAt) {
      console.log('📦 [SEARCH CACHE] Hit for:', cacheKey);
      return cached.results;
    }
    
    // Also check for partial match (same query, different radius/category)
    const queryOnlyKey = query.toLowerCase();
    const partialMatch = Object.entries(searchCache).find(([key, value]) => 
      key.startsWith(queryOnlyKey) && Date.now() < value.expiresAt
    );
    
    if (partialMatch) {
      console.log('📦 [SEARCH CACHE] Partial hit for:', queryOnlyKey);
      return partialMatch[1].results;
    }
    
    console.log('📦 [SEARCH CACHE] Miss for:', cacheKey);
    return null;
  }, [searchCache]);

  // Clear expired cache entries
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    setSearchCache(prev => {
      const filtered = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (now < value.expiresAt) {
          filtered[key] = value;
        }
      });
      return filtered;
    });
  }, []);

  // Get all cached place results for a query (from any radius/category combo)
  const getCachedPlaces = useCallback((query) => {
    const queryLower = query.toLowerCase();
    const allPlaces = [];
    const seenIds = new Set();
    
    Object.entries(searchCache).forEach(([key, value]) => {
      if (key.startsWith(queryLower) && Date.now() < value.expiresAt) {
        const places = value.results?.places || [];
        places.forEach(place => {
          const id = place.google_place_id || place.id;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            allPlaces.push(place);
          }
        });
      }
    });
    
    console.log('📦 [SEARCH CACHE] Found', allPlaces.length, 'cached places for:', queryLower);
    return allPlaces;
  }, [searchCache]);

  const value = {
    cacheSearch,
    getCachedSearch,
    getCachedPlaces,
    clearExpiredCache
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

export default SearchContext;

