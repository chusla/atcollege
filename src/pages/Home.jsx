import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
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

export default function Home() {
  const navigate = useNavigate();
  const { getCurrentUser, isAuthenticated, isRegistrationComplete, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    events: [], places: [], opportunities: [], groups: [],
    eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
  });
  const [searchLoading, setSearchLoading] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      if (!isRegistrationComplete()) {
        navigate(createPageUrl('Onboarding'));
        return;
      }
      loadData();
    }
  }, [authLoading, isAuthenticated, isRegistrationComplete]);

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
    console.log('🔍 [SEARCH] Starting search:', { query, radius, category });
    setSearchQuery(query);
    
    if (!query.trim() && category === 'all') {
      console.log('🔍 [SEARCH] Empty query and category, clearing results');
      setSearchResults({
        events: [], places: [], opportunities: [], groups: [],
        eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
      });
      return;
    }

    setSearchLoading(true);
    try {
      // Get user's campus location
      console.log('🔍 [SEARCH] User info:', { 
        userId: user?.id, 
        selectedCampusId: user?.selected_campus_id 
      });
      
      let campusLocation = null;
      if (user?.selected_campus_id) {
        try {
          console.log('🔍 [SEARCH] Fetching campus:', user.selected_campus_id);
          const campus = await Campus.get(user.selected_campus_id);
          console.log('🔍 [SEARCH] Campus data:', campus);
          
          if (campus?.latitude && campus?.longitude) {
            campusLocation = {
              lat: parseFloat(campus.latitude),
              lng: parseFloat(campus.longitude)
            };
            console.log('🔍 [SEARCH] Campus location:', campusLocation);
          } else {
            console.warn('🔍 [SEARCH] Campus missing coordinates:', campus);
          }
        } catch (error) {
          console.error('🔍 [SEARCH] Error fetching campus:', error);
        }
      } else {
        console.warn('🔍 [SEARCH] No selected_campus_id for user');
      }

      // Convert radius to meters for Google Places API
      const radiusMeters = radius === 'all' ? 50000 : milesToMeters(parseFloat(radius));
      console.log('🔍 [SEARCH] Radius in meters:', radiusMeters);

      // Search Google Places if we have a campus location and (query or category)
      let googlePlacesResults = [];
      if (campusLocation) {
        try {
          if (category !== 'all' && !query.trim()) {
            // Category-only search using nearby search
            const googleType = categoryToGoogleType(category);
            console.log('🔍 [SEARCH] Category-only search:', { category, googleType });
            googlePlacesResults = await searchNearby(campusLocation, radiusMeters, googleType);
            console.log('🔍 [SEARCH] Google Nearby results:', googlePlacesResults.length, googlePlacesResults);
          } else if (query.trim()) {
            // Text search with optional category filter
            const searchQuery = category !== 'all' 
              ? `${query} ${category}` 
              : query;
            console.log('🔍 [SEARCH] Text search:', { searchQuery, location: campusLocation, radiusMeters });
            googlePlacesResults = await searchPlaces(searchQuery, campusLocation, radiusMeters);
            console.log('🔍 [SEARCH] Google Places results:', googlePlacesResults.length, googlePlacesResults);
          }
        } catch (error) {
          console.error('🔍 [SEARCH] Error searching Google Places:', error);
          // Continue with database search even if Google fails
        }
      } else {
        console.warn('🔍 [SEARCH] No campus location, skipping Google Places search');
      }

      // Process Google Places results: batch check for existing, insert new ones
      console.log('🔍 [SEARCH] Processing', googlePlacesResults.length, 'Google Places results');
      
      // Batch check which places already exist (idempotent check)
      const googlePlaceIds = googlePlacesResults
        .map(p => p.google_place_id)
        .filter(id => id); // Remove null/undefined
      
      console.log('🔍 [SEARCH] Batch checking', googlePlaceIds.length, 'places for existence');
      const existingPlaces = await Place.findByGooglePlaceIds(googlePlaceIds);
      const existingPlacesMap = new Map(
        existingPlaces.map(p => [p.google_place_id, p])
      );
      console.log('🔍 [SEARCH] Found', existingPlaces.length, 'existing places');
      
      // Separate new vs existing places
      const newPlaces = [];
      const processedGooglePlaces = [];
      const newPlaceIds = [];
      
      for (const googlePlace of googlePlacesResults) {
        try {
          const existing = existingPlacesMap.get(googlePlace.google_place_id);
          
          if (existing) {
            console.log('🔍 [SEARCH] Place exists:', existing.name, 'status:', existing.status);
            // Use existing place if approved or pending
            if (existing.status === 'approved' || existing.status === 'pending') {
              processedGooglePlaces.push(existing);
            } else {
              console.log('🔍 [SEARCH] Skipping existing place with status:', existing.status);
            }
          } else {
            // Only fetch details and create if it's a new place
            newPlaces.push(googlePlace);
          }
        } catch (error) {
          console.error('🔍 [SEARCH] Error checking Google Place:', googlePlace.name, error);
        }
      }
      
      console.log('🔍 [SEARCH] Creating', newPlaces.length, 'new places');
      
      // Process new places (fetch details and create)
      for (const googlePlace of newPlaces) {
        try {
          console.log('🔍 [SEARCH] Creating new place:', googlePlace.name);
          
          // Fetch detailed place info to get photos and description (only for new places)
          // This is CRITICAL - details API has photos and editorial_summary
          let detailedPlace = googlePlace;
          if (googlePlace.google_place_id) {
            try {
              console.log('🔍 [SEARCH] Fetching place details for:', googlePlace.name, 'ID:', googlePlace.google_place_id);
              const details = await getPlaceDetails(googlePlace.google_place_id);
              if (details) {
                // Merge details, prioritizing details API data (has photos & descriptions)
                detailedPlace = { 
                  ...googlePlace, 
                  ...details,
                  // Ensure we use photo_url from details if available, otherwise from search
                  photo_url: details.photo_url || googlePlace.photo_url || null,
                  // Ensure we use editorial summary from details
                  editorials_summary: details.editorials_summary || null
                };
                console.log('🔍 [SEARCH] Fetched place details:', {
                  name: details.name,
                  hasPhoto: !!detailedPlace.photo_url,
                  photoUrl: detailedPlace.photo_url?.substring(0, 100) + '...',
                  hasDescription: !!detailedPlace.editorials_summary,
                  description: detailedPlace.editorials_summary?.substring(0, 100) + '...'
                });
              } else {
                console.warn('🔍 [SEARCH] No details returned for:', googlePlace.name, '- using search result data');
              }
            } catch (error) {
              console.error('🔍 [SEARCH] Error fetching place details:', googlePlace.name, error);
              // Continue with search result data
            }
          } else {
            console.warn('🔍 [SEARCH] No google_place_id for:', googlePlace.name);
          }
          
          const newPlace = await Place.createFromGooglePlace(detailedPlace, user?.selected_campus_id);
          console.log('🔍 [SEARCH] Created place:', newPlace.id, newPlace.name, 'status:', newPlace.status);
          processedGooglePlaces.push(newPlace);
          newPlaceIds.push(newPlace.id);
        } catch (error) {
          console.error('🔍 [SEARCH] Error creating Google Place:', googlePlace.name, error);
        }
      }
      
      // Update images for existing places that have google_place_id but placeholder images
      // This runs in background and doesn't block search results
      if (existingPlaces.length > 0) {
        setTimeout(async () => {
          const placesNeedingImages = existingPlaces.filter(p => {
            const hasGoogleId = p.google_place_id
            const hasPlaceholderImage = !p.image_url || 
              p.image_url.includes('unsplash') || 
              p.image_url.includes('placeholder')
            return hasGoogleId && hasPlaceholderImage
          })
          
          if (placesNeedingImages.length > 0) {
            console.log('🔍 [SEARCH] Updating images for', placesNeedingImages.length, 'existing places')
            for (const place of placesNeedingImages.slice(0, 10)) { // Limit to 10 per search
              try {
                await Place.updateImageFromGoogle(place.id, place.google_place_id)
              } catch (error) {
                console.warn('🔍 [SEARCH] Could not update image for place:', place.id, error)
              }
            }
          }
        }, 2000) // Wait 2 seconds after search completes
      }
      
      console.log('🔍 [SEARCH] Processed places:', processedGooglePlaces.length, 'New place IDs:', newPlaceIds.length);

      // Queue new places for categorization (async, non-blocking)
      // Prioritize categorization so places show up in filtered results
      if (newPlaceIds.length > 0) {
        categorizationQueue.enqueueBatch(newPlaceIds);
        // Start processing immediately in background (batch processing is efficient)
        setTimeout(() => categorizationQueue.start(), 500);
      }

      // Search database for existing places, events, opportunities, groups
      // Include pending places so newly imported Google Places show up
      console.log('🔍 [SEARCH] Fetching database records...');
      const [allEvents, allPlaces, allOpps, allGroups] = await Promise.all([
        Event.filter({ status: 'approved' }),
        Place.filter({ status: ['approved', 'pending'] }),
        Opportunity.filter({ status: 'approved' }),
        InterestGroup.filter({ status: 'approved' })
      ]);
      console.log('🔍 [SEARCH] Database results:', {
        events: allEvents?.length || 0,
        places: allPlaces?.length || 0,
        opportunities: allOpps?.length || 0,
        groups: allGroups?.length || 0
      });

      const searchLower = query.toLowerCase();
      
      // Filter by search query
      let filteredEvents = (allEvents || []).filter(e => 
        e.title?.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.category?.toLowerCase().includes(searchLower)
      );
      
      let filteredPlaces = (allPlaces || []).filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
      );
      console.log('🔍 [SEARCH] Filtered places from DB:', filteredPlaces.length);

      // Filter by radius BEFORE merging (ensures accurate distance calculations)
      // Google Places API radius is approximate, so we filter with Haversine formula
      let filteredGooglePlaces = processedGooglePlaces;
      let filteredDbPlaces = filteredPlaces;
      
      if (campusLocation && radius !== 'all') {
        const radiusMiles = parseFloat(radius);
        console.log('🔍 [SEARCH] Filtering by radius:', radiusMiles, 'miles from campus');
        
        // Filter Google Places results by exact radius (Haversine formula)
        filteredGooglePlaces = filterByRadius(
          processedGooglePlaces,
          campusLocation.lat,
          campusLocation.lng,
          radiusMiles
        );
        console.log('🔍 [SEARCH] Google Places after radius filter:', filteredGooglePlaces.length);
        
        // Filter database places by exact radius (Haversine formula)
        filteredDbPlaces = filterByRadius(
          filteredPlaces,
          campusLocation.lat,
          campusLocation.lng,
          radiusMiles
        );
        console.log('🔍 [SEARCH] DB places after radius filter:', filteredDbPlaces.length);
      } else {
        // If no radius filter, still calculate distances for sorting
        if (campusLocation) {
          filteredGooglePlaces = processedGooglePlaces.map(p => {
            if (p.latitude && p.longitude) {
              const distance = calculateDistance(
                campusLocation.lat,
                campusLocation.lng,
                parseFloat(p.latitude),
                parseFloat(p.longitude)
              );
              return { ...p, distance: Math.round(distance * 10) / 10 };
            }
            return p;
          }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
          
          filteredDbPlaces = filteredPlaces.map(p => {
            if (p.latitude && p.longitude) {
              const distance = calculateDistance(
                campusLocation.lat,
                campusLocation.lng,
                parseFloat(p.latitude),
                parseFloat(p.longitude)
              );
              return { ...p, distance: Math.round(distance * 10) / 10 };
            }
            return p;
          }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }
      }

      // Merge Google Places results with database results
      // Deduplicate by ID (prefer Google Places version if duplicate)
      console.log('🔍 [SEARCH] Merging results:', {
        googlePlaces: filteredGooglePlaces.length,
        dbPlaces: filteredDbPlaces.length
      });
      const mergedGooglePlaceIds = new Set(filteredGooglePlaces.map(p => p.id));
      const dbPlacesWithoutGoogle = filteredDbPlaces.filter(p => !mergedGooglePlaceIds.has(p.id));
      let mergedPlaces = [...filteredGooglePlaces, ...dbPlacesWithoutGoogle];
      
      // Sort by distance if available
      mergedPlaces.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      console.log('🔍 [SEARCH] Merged places:', mergedPlaces.length);

      // Filter by category if specified
      let finalPlaces = mergedPlaces;
      if (category !== 'all') {
        console.log('🔍 [SEARCH] Filtering by category:', category);
        finalPlaces = mergedPlaces.filter(p => 
          p.category?.toLowerCase() === category.toLowerCase() ||
          p.llm_category?.toLowerCase() === category.toLowerCase()
        );
        console.log('🔍 [SEARCH] Places after category filter:', finalPlaces.length);
      }
      
      let filteredOpps = (allOpps || []).filter(o => 
        o.title?.toLowerCase().includes(searchLower) ||
        o.description?.toLowerCase().includes(searchLower) ||
        o.type?.toLowerCase().includes(searchLower)
      );
      
      let filteredGroups = (allGroups || []).filter(g => 
        g.name?.toLowerCase().includes(searchLower) ||
        g.description?.toLowerCase().includes(searchLower) ||
        g.category?.toLowerCase().includes(searchLower)
      );

      const results = {
        events: filteredEvents.slice(0, 5),
        places: finalPlaces.slice(0, 5),
        opportunities: filteredOpps.slice(0, 5),
        groups: filteredGroups.slice(0, 5),
        eventsCount: filteredEvents.length,
        placesCount: finalPlaces.length,
        opportunitiesCount: filteredOpps.length,
        groupsCount: filteredGroups.length
      };
      
      console.log('🔍 [SEARCH] Final results:', {
        events: results.eventsCount,
        places: results.placesCount,
        opportunities: results.opportunitiesCount,
        groups: results.groupsCount,
        placesPreview: results.places.map(p => ({ name: p.name, status: p.status, source: p.source }))
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('🔍 [SEARCH] Error searching:', error);
    } finally {
      setSearchLoading(false);
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
          <SearchBar onSearch={handleSearch} />
        </motion.div>

        {/* Search Results */}
        {searchQuery && (
          <SearchResults 
            results={searchResults} 
            query={searchQuery}
            loading={searchLoading}
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

