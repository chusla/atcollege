import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, Campus } from '@/api/entities';
import { searchPlaces, searchNearby, milesToMeters, categoryToGoogleType } from '@/api/googlePlaces';
import { filterByRadius } from '@/utils/geo';
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
    setSearchQuery(query);
    
    if (!query.trim() && category === 'all') {
      setSearchResults({
        events: [], places: [], opportunities: [], groups: [],
        eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
      });
      return;
    }

    setSearchLoading(true);
    try {
      // Get user's campus location
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
          console.error('Error fetching campus:', error);
        }
      }

      // Convert radius to meters for Google Places API
      const radiusMeters = radius === 'all' ? 50000 : milesToMeters(parseFloat(radius));

      // Search Google Places if we have a campus location and (query or category)
      let googlePlacesResults = [];
      if (campusLocation) {
        try {
          if (category !== 'all' && !query.trim()) {
            // Category-only search using nearby search
            const googleType = categoryToGoogleType(category);
            googlePlacesResults = await searchNearby(campusLocation, radiusMeters, googleType);
          } else if (query.trim()) {
            // Text search with optional category filter
            const searchQuery = category !== 'all' 
              ? `${query} ${category}` 
              : query;
            googlePlacesResults = await searchPlaces(searchQuery, campusLocation, radiusMeters);
          }
        } catch (error) {
          console.error('Error searching Google Places:', error);
          // Continue with database search even if Google fails
        }
      }

      // Process Google Places results: check for existing, insert new ones
      const processedGooglePlaces = [];
      const newPlaceIds = [];
      for (const googlePlace of googlePlacesResults) {
        try {
          // Check if place already exists
          const existing = await Place.findByGooglePlaceId(googlePlace.google_place_id);
          
          if (existing) {
            // Use existing place if approved or pending
            if (existing.status === 'approved' || existing.status === 'pending') {
              processedGooglePlaces.push(existing);
            }
          } else {
            // Create new place from Google data
            const newPlace = await Place.createFromGooglePlace(googlePlace, user?.selected_campus_id);
            processedGooglePlaces.push(newPlace);
            newPlaceIds.push(newPlace.id);
          }
        } catch (error) {
          console.error('Error processing Google Place:', error);
        }
      }

      // Queue new places for categorization (async, non-blocking)
      if (newPlaceIds.length > 0) {
        categorizationQueue.enqueueBatch(newPlaceIds);
        // Start processing in background
        setTimeout(() => categorizationQueue.start(), 1000);
      }

      // Filter Google Places results by radius if specified
      let filteredGooglePlaces = processedGooglePlaces;
      if (campusLocation && radius !== 'all') {
        filteredGooglePlaces = filterByRadius(
          processedGooglePlaces,
          campusLocation.lat,
          campusLocation.lng,
          parseFloat(radius)
        );
      }

      // Search database for existing places, events, opportunities, groups
      // Include pending places so newly imported Google Places show up
      const [allEvents, allPlaces, allOpps, allGroups] = await Promise.all([
        Event.filter({ status: 'approved' }),
        Place.filter({ status: ['approved', 'pending'] }),
        Opportunity.filter({ status: 'approved' }),
        InterestGroup.filter({ status: 'approved' })
      ]);

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

      // Merge Google Places results with database results
      // Deduplicate by ID
      const googlePlaceIds = new Set(filteredGooglePlaces.map(p => p.id));
      const dbPlacesWithoutGoogle = filteredPlaces.filter(p => !googlePlaceIds.has(p.id));
      const mergedPlaces = [...filteredGooglePlaces, ...dbPlacesWithoutGoogle];

      // Filter by category if specified
      let finalPlaces = mergedPlaces;
      if (category !== 'all') {
        finalPlaces = mergedPlaces.filter(p => 
          p.category?.toLowerCase() === category.toLowerCase() ||
          p.llm_category?.toLowerCase() === category.toLowerCase()
        );
      }

      // Filter by radius for database places
      if (campusLocation && radius !== 'all') {
        const dbPlacesWithDistance = filterByRadius(
          dbPlacesWithoutGoogle,
          campusLocation.lat,
          campusLocation.lng,
          parseFloat(radius)
        );
        // Re-merge with Google places (which already have distance)
        finalPlaces = [...filteredGooglePlaces, ...dbPlacesWithDistance];
        if (category !== 'all') {
          finalPlaces = finalPlaces.filter(p => 
            p.category?.toLowerCase() === category.toLowerCase() ||
            p.llm_category?.toLowerCase() === category.toLowerCase()
          );
        }
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

      setSearchResults({
        events: filteredEvents.slice(0, 5),
        places: finalPlaces.slice(0, 5),
        opportunities: filteredOpps.slice(0, 5),
        groups: filteredGroups.slice(0, 5),
        eventsCount: filteredEvents.length,
        placesCount: finalPlaces.length,
        opportunitiesCount: filteredOpps.length,
        groupsCount: filteredGroups.length
      });
    } catch (error) {
      console.error('Error searching:', error);
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
              previewSubtitle="4.3 ★★★★"
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

