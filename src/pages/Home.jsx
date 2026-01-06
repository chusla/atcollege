import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSearch } from '@/contexts/SearchContext';
import { Event, Place, Opportunity, InterestGroup, Campus } from '@/api/entities';
import { searchPlaces, searchNearby, getPlaceDetails, milesToMeters, categoryToGoogleType } from '@/api/googlePlaces';
import { filterByRadius, calculateDistance } from '@/utils/geo';
import { categorizationQueue } from '@/utils/categorizationQueue';
import IntentModule from '../components/explore/IntentModule';
import GroupCard from '../components/cards/GroupCard';
import SearchBar from '../components/home/SearchBar';
import SearchResults from '../components/home/SearchResults';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

/**
 * Calculate relevance score for a place based on search query
 * Returns a score 0-100 (100 = perfect match)
 */
function calculateRelevanceScore(place, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return 100; // No query = all relevant
  
  const query = searchQuery.toLowerCase().trim();
  const queryWords = query.split(/\s+/);
  let score = 0;
  
  // Check name (highest weight)
  const name = (place.name || '').toLowerCase();
  if (name.includes(query)) {
    score += 50; // Full query in name = strong match
  } else {
    // Check individual words
    queryWords.forEach(word => {
      if (word.length > 2 && name.includes(word)) score += 20;
    });
  }
  
  // Check Google types (e.g., "bagel_shop", "pizza_restaurant")
  const types = place.types || place.google_place_data?.types || [];
  types.forEach(type => {
    const typeLower = type.toLowerCase().replace(/_/g, ' ');
    if (typeLower.includes(query)) score += 30;
    queryWords.forEach(word => {
      if (word.length > 2 && typeLower.includes(word)) score += 15;
    });
  });
  
  // Check primary type
  const primaryType = (place.primaryType || place.google_place_data?.primaryType || '').toLowerCase().replace(/_/g, ' ');
  if (primaryType.includes(query)) score += 25;
  
  // Check category
  const category = (place.category || '').toLowerCase();
  if (category.includes(query)) score += 20;
  
  // Check description/editorial
  const description = (place.description || place.editorials_summary || place.google_place_data?.editorials_summary || '').toLowerCase();
  if (description.includes(query)) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Filter and sort places by relevance to search query
 */
function filterByRelevance(places, searchQuery, minScore = 15) {
  if (!searchQuery || !searchQuery.trim()) return places;
  
  return places
    .map(place => ({
      ...place,
      _relevanceScore: calculateRelevanceScore(place, searchQuery)
    }))
    .filter(place => place._relevanceScore >= minScore)
    .sort((a, b) => b._relevanceScore - a._relevanceScore);
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getCurrentUser, isAuthenticated, isRegistrationComplete, loading: authLoading, profileLoaded } = useAuth();
  const { cacheSearch } = useSearch();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState('5'); // Store radius for URL persistence
  const [searchCategory, setSearchCategory] = useState('all'); // Store category for URL persistence
  const [searchResults, setSearchResults] = useState({
    events: [], places: [], opportunities: [], groups: [],
    eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false); // For progressive Google results
  const initialSearchDone = useRef(false);

  const user = getCurrentUser();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      // Wait for profile to be loaded before checking registration
      if (!profileLoaded) {
        return; // Wait for profile to load
      }
      if (!isRegistrationComplete()) {
        navigate(createPageUrl('Onboarding'));
        return;
      }
      loadData();
    }
  }, [authLoading, isAuthenticated, isRegistrationComplete, profileLoaded]);

  // Restore search from URL params when navigating back
  useEffect(() => {
    if (!authLoading && !loading && user && !initialSearchDone.current) {
      const urlQuery = searchParams.get('search');
      const urlRadius = searchParams.get('radius') || '5';
      const urlCategory = searchParams.get('category') || 'all';
      
      if (urlQuery) {
        console.log('🔍 [URL] Restoring search from URL:', { urlQuery, urlRadius, urlCategory });
        initialSearchDone.current = true;
        setSearchQuery(urlQuery);
        setSearchRadius(urlRadius);
        setSearchCategory(urlCategory);
        // Trigger the search with URL params after a small delay to ensure state is set
        setTimeout(() => {
          handleSearch(urlQuery, urlRadius, urlCategory);
        }, 0);
      }
    }
  }, [authLoading, loading, user, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const groupsData = await InterestGroup.filter(
        { status: 'approved' }, 
        { orderBy: { column: 'member_count', ascending: false }, limit: 4 }
      );
      setGroups(groupsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventsSubmit = (filters) => {
    const params = new URLSearchParams({
      category: filters.category || '',
      timeWindow: filters.timeWindow || '',
      radius: filters.radius || ''
    });
    navigate(createPageUrl('Events') + '?' + params.toString());
  };

  const handlePlacesSubmit = (filters) => {
    const params = new URLSearchParams({
      category: filters.category || '',
      radius: filters.radius || ''
    });
    navigate(createPageUrl('Places') + '?' + params.toString());
  };

  const handleOpportunitiesSubmit = (filters) => {
    const params = new URLSearchParams({
      type: filters.category || '',
      timeWindow: filters.timeWindow || '',
      radius: filters.radius || ''
    });
    navigate(createPageUrl('Opportunities') + '?' + params.toString());
  };

  const handleSearch = async (query, radius, category = 'all') => {
    console.log('🔍 [SEARCH] Starting optimized search:', { query, radius, category });
    setSearchQuery(query);
    setSearchRadius(radius);
    setSearchCategory(category);
    
    // Update URL with search params (enables back button to restore search)
    if (query.trim() || category !== 'all') {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query);
      if (radius && radius !== '5') params.set('radius', radius);
      if (category && category !== 'all') params.set('category', category);
      setSearchParams(params, { replace: true });
    } else {
      // Clear URL params when search is cleared
      setSearchParams({}, { replace: true });
    }
    
    if (!query.trim() && category === 'all') {
      console.log('🔍 [SEARCH] Empty query and category, clearing results');
      setSearchResults({
        events: [], places: [], opportunities: [], groups: [],
        eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
      });
      return;
    }

    setSearchLoading(true);
    
    // Get user's campus location first (needed for both DB and Google searches)
    let campusLocation = null;
    if (user?.selected_campus_id) {
      try {
        const campus = await Campus.get(user.selected_campus_id);
        if (campus?.latitude && campus?.longitude) {
          campusLocation = {
            lat: parseFloat(campus.latitude),
            lng: parseFloat(campus.longitude)
          };
        }
      } catch (error) {
        console.error('🔍 [SEARCH] Error fetching campus:', error);
      }
    }

    const radiusMeters = radius === 'all' ? 50000 : milesToMeters(parseFloat(radius));
    const radiusMiles = radius === 'all' ? null : parseFloat(radius);
    const searchLower = query.toLowerCase();

    // Helper to filter and add distance to places
    const processPlacesWithDistance = (places, filterByQuery = true) => {
      let filtered = places;
      if (filterByQuery && query.trim()) {
        filtered = places.filter(p => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower)
        );
      }
      
      if (campusLocation && radiusMiles) {
        filtered = filterByRadius(filtered, campusLocation.lat, campusLocation.lng, radiusMiles);
      } else if (campusLocation) {
        filtered = filtered.map(p => {
          if (p.latitude && p.longitude) {
            const distance = calculateDistance(
              campusLocation.lat, campusLocation.lng,
              parseFloat(p.latitude), parseFloat(p.longitude)
            );
            return { ...p, distance: Math.round(distance * 10) / 10 };
          }
          return p;
        }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
      
      // Filter by category if specified
      if (category !== 'all') {
        filtered = filtered.filter(p => 
          p.category?.toLowerCase() === category.toLowerCase() ||
          p.llm_category?.toLowerCase() === category.toLowerCase()
        );
      }
      
      return filtered;
    };

    try {
      // ============ PHASE 1: Show DB results IMMEDIATELY ============
      console.log('🔍 [SEARCH] PHASE 1: Fetching DB results immediately...');
      const [allEvents, allPlaces, allOpps, allGroups] = await Promise.all([
        Event.filter({ status: 'approved' }),
        Place.filter({ status: ['approved', 'pending'] }),
        Opportunity.filter({ status: 'approved' }),
        InterestGroup.filter({ status: 'approved' })
      ]);

      // Filter DB results
      const filteredEvents = (allEvents || []).filter(e => 
        e.title?.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.category?.toLowerCase().includes(searchLower)
      );
      
      const filteredDbPlaces = processPlacesWithDistance(allPlaces || []);
      
      const filteredOpps = (allOpps || []).filter(o => 
        o.title?.toLowerCase().includes(searchLower) ||
        o.description?.toLowerCase().includes(searchLower) ||
        o.type?.toLowerCase().includes(searchLower)
      );
      
      const filteredGroups = (allGroups || []).filter(g => 
        g.name?.toLowerCase().includes(searchLower) ||
        g.description?.toLowerCase().includes(searchLower) ||
        g.category?.toLowerCase().includes(searchLower)
      );

      // Show DB results IMMEDIATELY
      const dbResults = {
        events: filteredEvents.slice(0, 5),
        places: filteredDbPlaces.slice(0, 5),
        opportunities: filteredOpps.slice(0, 5),
        groups: filteredGroups.slice(0, 5),
        eventsCount: filteredEvents.length,
        placesCount: filteredDbPlaces.length,
        opportunitiesCount: filteredOpps.length,
        groupsCount: filteredGroups.length
      };
      
      console.log('🔍 [SEARCH] PHASE 1 COMPLETE - Showing', dbResults.placesCount, 'DB places immediately');
      setSearchResults(dbResults);
      setSearchLoading(false);
      
      // ============ PHASE 2: Fetch Google Places in background ============
      if (!campusLocation) {
        console.log('🔍 [SEARCH] No campus location, skipping Google search');
        return;
      }

      setLoadingMore(true);
      console.log('🔍 [SEARCH] PHASE 2: Fetching Google Places...');
      
      let googlePlacesResults = [];
      try {
        if (category !== 'all' && !query.trim()) {
          const googleType = categoryToGoogleType(category);
          googlePlacesResults = await searchNearby(campusLocation, radiusMeters, googleType);
        } else if (query.trim()) {
          const searchQuery = category !== 'all' ? `${query} ${category}` : query;
          googlePlacesResults = await searchPlaces(searchQuery, campusLocation, radiusMeters);
        }
      } catch (error) {
        console.error('🔍 [SEARCH] Google Places error:', error);
        setLoadingMore(false);
        return;
      }

      if (googlePlacesResults.length === 0) {
        console.log('🔍 [SEARCH] No Google results');
        setLoadingMore(false);
        return;
      }

      // Check which places already exist
      const googlePlaceIds = googlePlacesResults.map(p => p.google_place_id).filter(Boolean);
      const existingPlaces = await Place.findByGooglePlaceIds(googlePlaceIds);
      const existingPlacesMap = new Map(existingPlaces.map(p => [p.google_place_id, p]));
      
      // ============ PHASE 3: Show Google results with basic info FIRST ============
      console.log('🔍 [SEARCH] PHASE 3: Showing Google results with skeleton data...');
      
      const newPlacesToCreate = [];
      const quickGooglePlaces = [];
      
      for (const googlePlace of googlePlacesResults) {
        const existing = existingPlacesMap.get(googlePlace.google_place_id);
        if (existing && (existing.status === 'approved' || existing.status === 'pending')) {
          quickGooglePlaces.push(existing);
        } else if (!existing) {
          // Add with basic info immediately (skeleton for image/description)
          quickGooglePlaces.push({
            ...googlePlace,
            id: `temp-${googlePlace.google_place_id}`,
            name: googlePlace.name,
            address: googlePlace.address,
            image_url: googlePlace.photo_url || null, // Use search result photo if available
            description: null,
            status: 'pending',
            source: 'google_maps',
            _isLoading: !googlePlace.photo_url, // Mark as loading if no photo yet
            latitude: googlePlace.latitude,
            longitude: googlePlace.longitude
          });
          newPlacesToCreate.push(googlePlace);
        }
      }

      // Merge with DB results and show immediately
      const existingDbIds = new Set(filteredDbPlaces.map(p => p.google_place_id).filter(Boolean));
      const newGooglePlaces = quickGooglePlaces.filter(p => !existingDbIds.has(p.google_place_id));
      
      // Apply relevance filtering to Google results
      const relevantGooglePlaces = filterByRelevance(newGooglePlaces, query, 15);
      console.log(`🔍 [SEARCH] Relevance filter: ${newGooglePlaces.length} -> ${relevantGooglePlaces.length} places`);
      
      let mergedPlaces = [...filteredDbPlaces, ...relevantGooglePlaces];
      mergedPlaces = processPlacesWithDistance(mergedPlaces, false);
      
      // Update results with quick Google data
      setSearchResults(prev => ({
        ...prev,
        places: mergedPlaces.slice(0, 5),
        placesCount: mergedPlaces.length
      }));

      // ============ PHASE 4: Process new places with full details in background ============
      console.log('🔍 [SEARCH] PHASE 4: Enriching', newPlacesToCreate.length, 'new places with details...');
      
      const newPlaceIds = [];
      const BATCH_SIZE = 3; // Process 3 at a time for faster updates
      
      for (let i = 0; i < newPlacesToCreate.length; i += BATCH_SIZE) {
        const batch = newPlacesToCreate.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(batch.map(async (googlePlace) => {
          try {
            // Fetch details for photo and description
            let detailedPlace = googlePlace;
            if (googlePlace.google_place_id) {
              const details = await getPlaceDetails(googlePlace.google_place_id);
              if (details) {
                detailedPlace = {
                  ...googlePlace,
                  ...details,
                  photo_url: details.photo_url || googlePlace.photo_url || null,
                  editorials_summary: details.editorials_summary || null
                };
              }
            }
            
            // Create in database
            const newPlace = await Place.createFromGooglePlace(detailedPlace, user?.selected_campus_id);
            newPlaceIds.push(newPlace.id);
            return newPlace;
          } catch (error) {
            console.error('🔍 [SEARCH] Error creating place:', googlePlace.name, error);
            return null;
          }
        }));

        // Update UI with enriched places after each batch
        const validResults = batchResults.filter(Boolean);
        if (validResults.length > 0) {
          setSearchResults(prev => {
            // Replace temp places with real ones
            const updatedPlaces = prev.places.map(p => {
              if (p.id?.startsWith('temp-')) {
                const realPlace = validResults.find(r => r.google_place_id === p.google_place_id);
                return realPlace || p;
              }
              return p;
            });
            
            // Also add any new places not in the preview
            const existingIds = new Set(updatedPlaces.map(p => p.google_place_id));
            const newOnes = validResults.filter(r => !existingIds.has(r.google_place_id));
            const allPlaces = [...updatedPlaces, ...newOnes];
            const processed = processPlacesWithDistance(allPlaces, false);
            
            return {
              ...prev,
              places: processed.slice(0, 5),
              placesCount: processed.length
            };
          });
        }
      }

      // Queue new places for categorization
      if (newPlaceIds.length > 0) {
        categorizationQueue.enqueueBatch(newPlaceIds);
        setTimeout(() => categorizationQueue.start(), 500);
      }

      // Update images for existing places in background
      if (existingPlaces.length > 0) {
        setTimeout(async () => {
          const placesNeedingImages = existingPlaces.filter(p => {
            const hasGoogleId = p.google_place_id;
            const hasPlaceholderImage = !p.image_url || 
              p.image_url.includes('unsplash') || 
              p.image_url.includes('placeholder');
            return hasGoogleId && hasPlaceholderImage;
          });
          
          for (const place of placesNeedingImages.slice(0, 10)) {
            try {
              await Place.updateImageFromGoogle(place.id, place.google_place_id);
            } catch (error) {
              console.warn('🔍 [SEARCH] Could not update image:', place.id, error);
            }
          }
        }, 2000);
      }
      
      console.log('🔍 [SEARCH] All phases complete');
      setLoadingMore(false);
      
      // Cache search results for "View All" page and save to DB
      setSearchResults(prev => {
        if (prev.places?.length > 0 && query) {
          cacheSearch(query, radius, category, prev, user?.selected_campus_id, campusLocation);
        }
        return prev;
      });
      
    } catch (error) {
      console.error('🔍 [SEARCH] Error:', error);
      setSearchLoading(false);
      setLoadingMore(false);
    }
  };

  const displayName = user?.first_name || 'there';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {displayName}
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
            What are you up to?
          </h2>
          <p className="text-gray-500 text-sm">
            Submit one option. You can always return to this page to submit other options
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <SearchBar 
            onSearch={handleSearch}
            initialQuery={searchQuery}
            initialRadius={searchRadius}
            initialCategory={searchCategory}
          />
        </motion.div>

        {/* Search Results */}
        {searchQuery && (
          <SearchResults 
            results={searchResults} 
            query={searchQuery}
            loading={searchLoading}
            loadingMore={loadingMore}
          />
        )}

        {/* Intent Modules - Only show when not searching */}
        {!searchQuery && (
          <div className="space-y-6">
            {/* Events Module */}
            <IntentModule
              title="Featured Events"
              prompt="Show me the next events in and around my campus"
              categories={[
                { value: 'Sports', label: 'Sports' },
                { value: 'Shows', label: 'Shows' },
                { value: 'Talks', label: 'Talks' },
                { value: 'Social', label: 'Social' }
              ]}
              showTimeWindow={true}
              showRadius={true}
              onSubmit={handleEventsSubmit}
              previewImage="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400"
              previewTitle="Concert in Park"
              previewSubtitle="April 25"
            />

            {/* Places Module */}
            <IntentModule
              title="Popular Places"
              prompt="Show me the best places in and around my campus"
              categories={[
                { value: 'Bars', label: 'Bars' },
                { value: 'Restaurants', label: 'Restaurants' },
                { value: 'Cafes', label: 'Cafes' },
                { value: 'Housing', label: 'Housing' },
                { value: 'Study Spots', label: 'Study Spots' }
              ]}
              showTimeWindow={false}
              showRadius={true}
              onSubmit={handlePlacesSubmit}
              previewImage="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400"
              previewTitle="Campus Café"
              previewSubtitle="Find great places near campus"
            />

            {/* Opportunities Module */}
            <IntentModule
              title="Volunteer / Work"
              prompt="Show me opportunities in and around my campus"
              categories={[
                { value: 'Volunteering', label: 'Volunteering' },
                { value: 'Internships', label: 'Internships' },
                { value: 'Part-time work', label: 'Part-time work' }
              ]}
              showTimeWindow={true}
              showRadius={true}
              onSubmit={handleOpportunitiesSubmit}
              previewImage="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400"
              previewTitle="Meet new friends"
              previewSubtitle="Various opportunities"
            />
          </div>
        )}

        {/* Interest Groups Section - Only show when not searching */}
        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Interest Groups you have demonstrated interest in:
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {loading ? (
                <div className="flex gap-4 overflow-x-auto">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="min-w-[160px] aspect-square rounded-2xl" />
                  ))}
                </div>
              ) : groups.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {groups.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Join groups to see them here
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

