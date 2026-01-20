import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Place, SavedItem, Campus } from '@/api/entities';
import { filterByRadius } from '@/utils/geo';
import PlaceCard from '../components/cards/PlaceCard';
import PlaceRowCard from '../components/results/PlaceRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { MapPin, Filter, Building2, Star, ArrowUpDown, SlidersHorizontal } from 'lucide-react';

export default function Places() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle } = useAuth();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
  const [category, setCategory] = useState(urlParams.get('category') || 'all');
  const [radius, setRadius] = useState(urlParams.get('radius') || 'any');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('highest');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    // If radius is set OR there's a search query, we need location for filtering/sorting
    if ((radius && radius !== 'any') || searchQuery) {
      getUserLocation();
    }
  }, [radius, searchQuery]);

  useEffect(() => {
    loadPlaces();
    loadSavedItems();
  }, [category, radius, userLocation, ratingFilter, sortBy, searchQuery]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      // Fallback to campus location if geolocation not supported
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
      const filters = {};
      if (category && category !== 'all') {
        // Map filter values to database category values
        const categoryMap = {
          'restaurant': 'Restaurants',
          'restaurants': 'Restaurants',
          'cafe': 'Cafes',
          'cafes': 'Cafes',
          'bar': 'Bars',
          'bars': 'Bars',
          'gym': 'Other', // Gym maps to Other in schema
          'library': 'Study Spots', // Library maps to Study Spots
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

      // Use raw query to include both approved and pending statuses
      let data = await Place.filter(filters, {
        limit: 100 // Get more to filter by radius
      });

      // Filter to approved or pending status (exclude rejected/spam)
      data = (data || []).filter(p => ['approved', 'pending'].includes(p.status));

      // --- Client-side Filtering ---

      // 0. Search Query Filter
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase();
        data = data.filter(p =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower) ||
          p.address?.toLowerCase().includes(searchLower)
        );
      }

      // 1. Rating Filter
      if (ratingFilter !== 'all') {
        data = data.filter(p => {
          const r = p.rating || 0;
          switch (ratingFilter) {
            case 'no_rating':
              return r === 0;
            case '5':
              return r >= 4.8; // Approximate for 5.0
            case '4':
              return r >= 4.0;
            case 'under_3':
              return r > 0 && r <= 3.0;
            default:
              return true;
          }
        });
      }

      // 2. Radius Filter
      if (userLocation && radius !== 'any' && radius !== 'all') {
        data = filterByRadius(
          data,
          userLocation.lat,
          userLocation.lng,
          parseFloat(radius)
        );
      } else if (userLocation && searchQuery && searchQuery.trim()) {
        // When searching with 'any' radius, use a large radius (50 miles) to filter out truly distant results
        // and add distance info for sorting
        data = filterByRadius(
          data,
          userLocation.lat,
          userLocation.lng,
          50 // 50 miles max when searching
        );
      }

      // --- Client-side Sorting ---
      data.sort((a, b) => {
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

      // Limit results
      setPlaces(data.slice(0, 50));
    } catch (error) {
      console.error('Error loading places:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {searchQuery ? `Places matching "${searchQuery}"` : 'Places'}
          </h1>
          <p className="text-gray-600">
            {searchQuery 
              ? `Showing results near your campus${radius !== 'any' ? ` within ${radius} miles` : ''}`
              : 'Find the best spots in and around campus'
            }
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
                    <SelectItem value="any">Any distance</SelectItem>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="2">2 miles</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="20">20 miles</SelectItem>
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
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No places found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

