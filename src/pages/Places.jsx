import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Place, SavedItem, Campus } from '@/api/entities';
import { searchPlaces, getPlaceDetails, milesToMeters } from '@/api/googlePlaces';
import { filterByRadius, calculateDistance, ANY_DISTANCE_RADIUS_MILES } from '@/utils/geo';
import PlaceCard from '../components/cards/PlaceCard';
import PlaceRowCard from '../components/results/PlaceRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { MapPin, Filter, Building2, Star, ArrowUpDown, SlidersHorizontal, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PLACES_PAGE_VERSION = '2.3.0-back-button';

export default function Places() {
  const navigate = useNavigate();
  const { isAuthenticated, getCurrentUser, signInWithGoogle, profile } = useAuth();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const googleSearchDone = useRef(false);

  // Log version on mount to verify deployment
  useEffect(() => {
    console.log(`📍 [PLACES PAGE] Version: ${PLACES_PAGE_VERSION} - Loaded at ${new Date().toISOString()}`);
    console.log('📍 [PLACES PAGE] Features: Google Places search enabled');
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
  const [category, setCategory] = useState(urlParams.get('category') || 'all');
  const [radius, setRadius] = useState(urlParams.get('radius') || '5');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('highest');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Always fetch campus location when user has a campus (geographic constraint)
  useEffect(() => {
    if (isAuthenticated() && (profile?.selected_campus_id ?? profile?.campus_id)) {
      fetchCampusLocation();
    }
  }, [isAuthenticated(), profile?.selected_campus_id, profile?.campus_id]);

  useEffect(() => {
    googleSearchDone.current = false;
  }, [searchQuery]);

  useEffect(() => {
    loadPlaces();
    loadSavedItems();
  }, [category, radius, userLocation, ratingFilter, sortBy, searchQuery]);

  const getUserLocation = () => {
    // App is campus-centered, not user-location centered
    // Always use the user's selected campus location for consistent results
    fetchCampusLocation();
    
    /* DISABLED: User geolocation - caused issues showing results from user's physical location
       instead of their selected campus (e.g., Hawaii results when user wanted Columbia)
    if (!navigator.geolocation) {
      fetchCampusLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
      },
      (error) => {
        console.warn('Geolocation denied or failed, falling back to campus location:', error);
        fetchCampusLocation();
      }
    );
    */
  };

  const fetchCampusLocation = async () => {
    try {
      if (isAuthenticated()) {
        const user = getCurrentUser();
        if (user?.selected_campus_id) {
          const campus = await Campus.get(user.selected_campus_id);
          if (campus && campus.latitude && campus.longitude) {
            setUserLocation({
              lat: parseFloat(campus.latitude),
              lng: parseFloat(campus.longitude)
            });
            setLocationError(null); // Clear error since we have a fallback
            return;
          }
        }
      }
      setLocationError('Please enable location services to filter by distance');
    } catch (error) {
      console.error('Error fetching campus location:', error);
      setLocationError('Unable to retrieve location');
    }
  };

  const loadPlaces = async () => {
    setLoading(true);
    try {
      let data = [];
      const radiusMiles = radius === 'any' ? ANY_DISTANCE_RADIUS_MILES : parseFloat(radius);
      const user = isAuthenticated() ? getCurrentUser() : null;
      const campusId = user?.selected_campus_id;

      // If we have a search query AND location, use the optimized searchNearby
      if (searchQuery && searchQuery.trim() && userLocation) {
        console.log('📍 [PLACES PAGE] Using searchNearby for:', searchQuery);
        data = await Place.searchNearby(searchQuery, userLocation.lat, userLocation.lng, radiusMiles, 100);
      } 
      // If we have location but no search, use listNearby
      else if (userLocation) {
        console.log('📍 [PLACES PAGE] Using listNearby');
        data = await Place.listNearby(userLocation.lat, userLocation.lng, radiusMiles, 100);
      }
      // Fallback to filter (no location)
      else {
        console.log('📍 [PLACES PAGE] Using filter (no location)');
        const filters = {};
        if (category && category !== 'all') {
          const categoryMap = {
            'restaurant': 'Restaurants',
            'restaurants': 'Restaurants',
            'cafe': 'Cafes',
            'cafes': 'Cafes',
            'bar': 'Bars',
            'bars': 'Bars',
            'gym': 'Other',
            'library': 'Study Spots',
            'study_spot': 'Study Spots',
            'study_spots': 'Study Spots',
            'housing': 'Housing',
            'entertainment': 'Entertainment',
            'shopping': 'Shopping',
            'other': 'Other'
          };
          const dbCategory = categoryMap[category.toLowerCase()] || category;
          filters.category = dbCategory;
        }
        data = await Place.filter(filters, { limit: 100 });
        data = (data || []).filter(p => ['approved', 'pending'].includes(p.status));
        
        // Client-side search filter when no location
        if (searchQuery && searchQuery.trim()) {
          const searchLower = searchQuery.toLowerCase();
          data = data.filter(p =>
            p.name?.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower) ||
            p.category?.toLowerCase().includes(searchLower) ||
            p.address?.toLowerCase().includes(searchLower)
          );
        }
      }

      // Constrain to user's campus when set (geographic already applied via listNearby center)
      if (campusId) {
        data = data.filter(p => p.campus_id === campusId || p.campus_id == null);
      }

      // Category filter (applies to all queries)
      if (category && category !== 'all') {
        const categoryMap = {
          'restaurant': 'Restaurants',
          'restaurants': 'Restaurants',
          'cafe': 'Cafes',
          'cafes': 'Cafes',
          'bar': 'Bars',
          'bars': 'Bars',
          'gym': 'Other',
          'library': 'Study Spots',
          'study_spot': 'Study Spots',
          'study_spots': 'Study Spots',
          'housing': 'Housing',
          'entertainment': 'Entertainment',
          'shopping': 'Shopping',
          'other': 'Other'
        };
        const dbCategory = categoryMap[category.toLowerCase()] || category;
        data = data.filter(p => 
          p.category === dbCategory || 
          p.llm_category === dbCategory
        );
      }

      // Rating Filter
      if (ratingFilter !== 'all') {
        data = data.filter(p => {
          const r = p.rating || 0;
          switch (ratingFilter) {
            case 'no_rating':
              return r === 0;
            case '5':
              return r >= 4.8;
            case '4':
              return r >= 4.0;
            case 'under_3':
              return r > 0 && r <= 3.0;
            default:
              return true;
          }
        });
      }

      // Sort and show DB results first
      const sortedData = sortPlaces(data);
      console.log('📍 [PLACES PAGE] DB results loaded:', {
        total: data.length,
        displayed: Math.min(sortedData.length, 50),
        searchQuery: searchQuery || 'none',
        hasLocation: !!userLocation
      });
      setPlaces(sortedData.slice(0, 50));
      setLoading(false);

      // Fetch Google Places when we have location AND either:
      // 1. There's a search query, OR
      // 2. DB results are empty (auto-populate with nearby popular places)
      if (userLocation && !googleSearchDone.current) {
        if (searchQuery && searchQuery.trim()) {
          googleSearchDone.current = true;
          fetchGooglePlaces(sortedData);
        } else if (data.length === 0) {
          // No DB results - auto-fetch popular places from Google to populate the page
          googleSearchDone.current = true;
          fetchGooglePlaces(sortedData, 'popular places restaurants cafes near campus');
        }
      }
    } catch (error) {
      console.error('Error loading places:', error);
      setLoading(false);
    }
  };

  const sortPlaces = (data) => {
    return [...data].sort((a, b) => {
      // When searching, prioritize by distance first (if available)
      if (searchQuery && searchQuery.trim() && a.distance !== undefined && b.distance !== undefined) {
        // Sort by distance first, then by rating
        if (Math.abs(a.distance - b.distance) > 0.5) { // If distance difference > 0.5 miles
          return a.distance - b.distance;
        }
        // If similar distance, fall back to rating
      }

      const rA = a.rating || 0;
      const rB = b.rating || 0;

      switch (sortBy) {
        case 'highest':
          // High -> Low, then No rating (0)
          return rB - rA;

        case 'lowest':
          // Low (but > 0) -> High, then No rating
          // Treat 0 as Infinity for sorting so it goes to end
          const valA = rA === 0 ? 999 : rA;
          const valB = rB === 0 ? 999 : rB;
          return valA - valB;

        case 'no_rating':
          // No rating (0) first, then High -> Low
          const isNoRatingA = rA === 0 ? 1 : 0;
          const isNoRatingB = rB === 0 ? 1 : 0;
          if (isNoRatingA !== isNoRatingB) {
            return isNoRatingB - isNoRatingA; // 1 (true) first
          }
          // If both have rating or both no rating, sort desc
          return rB - rA;

        default:
          return rB - rA;
      }
    });
  };

  const fetchGooglePlaces = async (dbPlaces, defaultQuery = null) => {
    const effectiveQuery = (searchQuery && searchQuery.trim()) || defaultQuery;
    if (!userLocation || !effectiveQuery) {
      console.log('📍 [PLACES PAGE] Skipping Google search - no location or query', { userLocation, searchQuery });
      return;
    }

    setLoadingGoogle(true);
    console.log('📍 [PLACES PAGE] Starting Google Places search:', {
      query: effectiveQuery,
      location: userLocation,
      radius: radius,
      dbPlacesCount: dbPlaces.length
    });

    try {
      const radiusMeters = radius === 'any' ? milesToMeters(ANY_DISTANCE_RADIUS_MILES) : milesToMeters(parseFloat(radius));
      const radiusMiles = radius === 'any' ? ANY_DISTANCE_RADIUS_MILES : parseFloat(radius);

      // Fetch Google Places
      const googleResults = await searchPlaces(effectiveQuery, userLocation, radiusMeters);
      
      if (!googleResults || googleResults.length === 0) {
        console.log('🔍 [PLACES PAGE] No Google results');
        setLoadingGoogle(false);
        return;
      }

      console.log('📍 [PLACES PAGE] Got', googleResults.length, 'Google results');

      // Check which places already exist in DB (for deduplication)
      const googlePlaceIds = googleResults.map(p => p.google_place_id).filter(Boolean);
      const existingPlaces = await Place.findByGooglePlaceIds(googlePlaceIds);
      const existingPlacesMap = new Map(existingPlaces.map(p => [p.google_place_id, p]));
      const existingDbIds = new Set(dbPlaces.map(p => p.google_place_id).filter(Boolean));
      
      // Count pending places for logging
      const pendingInDb = dbPlaces.filter(p => p.status === 'pending').length;
      const approvedInDb = dbPlaces.filter(p => p.status === 'approved').length;
      console.log('📍 [PLACES PAGE] Deduplication check:', {
        googleResults: googleResults.length,
        existingInDb: existingPlaces.length,
        alreadyInResults: existingDbIds.size,
        dbBreakdown: { pending: pendingInDb, approved: approvedInDb }
      });

      // Process Google results - show immediately with basic info
      const newGooglePlaces = [];
      for (const googlePlace of googleResults) {
        const existing = existingPlacesMap.get(googlePlace.google_place_id);
        if (existing && !existingDbIds.has(existing.google_place_id)) {
          // Use existing DB place
          const withDistance = {
            ...existing,
            distance: calculateDistance(userLocation.lat, userLocation.lng, 
              parseFloat(existing.latitude), parseFloat(existing.longitude))
          };
          if (withDistance.distance <= radiusMiles) {
            newGooglePlaces.push(withDistance);
          }
        } else if (!existing && !existingDbIds.has(googlePlace.google_place_id)) {
          // New place from Google - add with basic info
          const distance = calculateDistance(userLocation.lat, userLocation.lng,
            googlePlace.latitude, googlePlace.longitude);
          if (distance <= radiusMiles) {
            newGooglePlaces.push({
              ...googlePlace,
              id: `google-${googlePlace.google_place_id}`,
              distance: Math.round(distance * 10) / 10,
              status: 'pending',
              source: 'google_maps',
              _isGoogleResult: true
            });
          }
        }
      }

      // Merge with DB results and sort
      const mergedPlaces = [...dbPlaces, ...newGooglePlaces];
      const sortedMerged = sortPlaces(mergedPlaces);
      
      // Count by source for logging
      const fromDbPending = mergedPlaces.filter(p => !p._isGoogleResult && p.status === 'pending').length;
      const fromDbApproved = mergedPlaces.filter(p => !p._isGoogleResult && p.status === 'approved').length;
      const fromGoogleNew = mergedPlaces.filter(p => p._isGoogleResult).length;
      
      console.log('📍 [PLACES PAGE] Merged results:', {
        dbPlaces: dbPlaces.length,
        newGooglePlaces: newGooglePlaces.length,
        total: mergedPlaces.length,
        displayed: Math.min(sortedMerged.length, 50),
        breakdown: {
          dbApproved: fromDbApproved,
          dbPending: fromDbPending,
          googleNew: fromGoogleNew
        }
      });
      setPlaces(sortedMerged.slice(0, 50));

      // Create new places in DB in background (don't block UI)
      const user = getCurrentUser();
      for (const place of newGooglePlaces.filter(p => p._isGoogleResult)) {
        try {
          const details = await getPlaceDetails(place.google_place_id);
          const placeData = details ? { ...place, ...details } : place;
          const created = await Place.createFromGooglePlace(placeData, user?.selected_campus_id);
          
          // Update the place in our list with the real DB record
          setPlaces(prev => prev.map(p => 
            p.google_place_id === place.google_place_id ? { ...created, distance: place.distance } : p
          ));
        } catch (error) {
          console.warn('Could not save place to DB:', place.name, error.message);
        }
      }

    } catch (error) {
      console.error('Error fetching Google Places:', error);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const loadSavedItems = async () => {
    try {
      if (isAuthenticated()) {
        const user = getCurrentUser();
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'place' });
        setSavedIds(new Set((saved || []).map(s => s.item_id)));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const handleSave = async (place) => {
    try {
      if (!isAuthenticated()) {
        signInWithGoogle();
        return;
      }

      const user = getCurrentUser();
      if (savedIds.has(place.id)) {
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'place', item_id: place.id });
        if (saved && saved.length > 0) {
          await SavedItem.delete(saved[0].id);
          setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(place.id);
            return next;
          });
        }
      } else {
        await SavedItem.create({ user_id: user?.id, item_type: 'place', item_id: place.id });
        setSavedIds(prev => new Set([...prev, place.id]));
      }
    } catch (error) {
      console.error('Error saving place:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {searchQuery ? `Places matching "${searchQuery}"` : 'Places'}
          </h1>
          <p className="text-gray-600">
            {searchQuery 
              ? `Showing results near your campus${radius !== 'any' ? ` within ${radius} miles` : ''}`
              : 'Find the best spots in and around campus'
            }
            {loadingGoogle && (
              <span className="inline-flex items-center gap-1 ml-2 text-orange-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching Google Places...
              </span>
            )}
          </p>
        </motion.div>

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {/* Filters */}
        <motion.div
          initial={false}
          animate={{ height: 'auto' }}
          className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8 ${showFilters ? 'block' : 'hidden'} lg:block`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="restaurants">Restaurants</SelectItem>
                    <SelectItem value="cafes">Cafes</SelectItem>
                    <SelectItem value="bars">Bars</SelectItem>
                    <SelectItem value="study_spots">Study Spots</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Radius Filter */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="2">2 miles</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="20">20 miles</SelectItem>
                    <SelectItem value="any">Any distance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating Filter */}
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5.0</SelectItem>
                    <SelectItem value="4">4.0+</SelectItem>
                    <SelectItem value="under_3">&lt; 3.0</SelectItem>
                    <SelectItem value="no_rating">No rating yet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highest">Highest Rating</SelectItem>
                    <SelectItem value="lowest">Lowest Rating</SelectItem>
                    <SelectItem value="no_rating">No Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="w-fit">
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          </div>
        </motion.div>

        {/* Map View */}
        {view === 'map' && !loading && places.length > 0 && (
          <ResultsMapView items={places} itemType="place" />
        )}

        {/* Places Grid */}
        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-4'}>
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className={view === 'grid' ? 'aspect-[4/5] rounded-2xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : places.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onSave={handleSave}
                  isSaved={savedIds.has(place.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {places.map((place) => (
                <PlaceRowCard
                  key={place.id}
                  place={place}
                  onSave={handleSave}
                  isSaved={savedIds.has(place.id)}
                />
              ))}
            </div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {loadingGoogle ? 'Searching...' : 'No places found'}
            </h3>
            <p className="text-gray-500">
              {loadingGoogle 
                ? 'Looking for places matching your search...'
                : searchQuery 
                  ? `No places found for "${searchQuery}". Try a different search term.`
                  : 'Try adjusting your filters'
              }
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

