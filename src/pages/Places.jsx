import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearch } from '@/contexts/SearchContext';
import { Place, SavedItem, Campus } from '@/api/entities';
import { searchPlaces, getPlaceDetails } from '@/api/googlePlaces';
import { filterByRadius } from '@/utils/geo';
import PlaceCard from '../components/cards/PlaceCard';
import PlaceRowCard from '../components/results/PlaceRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { MapPin, Filter, Building2 } from 'lucide-react';

/**
 * Calculate relevance score for a place based on search query
 */
function calculateRelevanceScore(place, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return 100;
  
  const query = searchQuery.toLowerCase().trim();
  const queryWords = query.split(/\s+/);
  let score = 0;
  
  const name = (place.name || '').toLowerCase();
  if (name.includes(query)) {
    score += 50;
  } else {
    queryWords.forEach(word => {
      if (word.length > 2 && name.includes(word)) score += 20;
    });
  }
  
  const types = place.types || place.google_place_data?.types || [];
  types.forEach(type => {
    const typeLower = type.toLowerCase().replace(/_/g, ' ');
    if (typeLower.includes(query)) score += 30;
    queryWords.forEach(word => {
      if (word.length > 2 && typeLower.includes(word)) score += 15;
    });
  });
  
  const primaryType = (place.primaryType || place.google_place_data?.primaryType || '').toLowerCase().replace(/_/g, ' ');
  if (primaryType.includes(query)) score += 25;
  
  const category = (place.category || '').toLowerCase();
  if (category.includes(query)) score += 20;
  
  const description = (place.description || place.editorials_summary || '').toLowerCase();
  if (description.includes(query)) score += 10;
  
  return Math.min(score, 100);
}

function filterByRelevance(places, searchQuery, minScore = 15) {
  if (!searchQuery || !searchQuery.trim()) return places;
  
  return places
    .map(place => ({ ...place, _relevanceScore: calculateRelevanceScore(place, searchQuery) }))
    .filter(place => place._relevanceScore >= minScore)
    .sort((a, b) => b._relevanceScore - a._relevanceScore);
}

export default function Places() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle } = useAuth();
  const { getCachedPlaces } = useSearch();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');

  const urlParams = new URLSearchParams(window.location.search);
  const [category, setCategory] = useState(urlParams.get('category') || 'all');
  const [radius, setRadius] = useState(urlParams.get('radius') || '5');
  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');

  useEffect(() => {
    loadPlaces();
    loadSavedItems();
  }, [category, radius, searchQuery]);

  const [campusCenter, setCampusCenter] = useState(null);

  const loadPlaces = async () => {
    setLoading(true);
    try {
      // Get user's campus location (default to Harvard if not set)
      const defaultLocation = { lat: 42.3770, lng: -71.1167 }; // Harvard
      let campusLocation = defaultLocation;
      
      const user = getCurrentUser();
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
      
      setCampusCenter(campusLocation);

      // Include both approved and pending statuses in the filter
      const filters = {
        status: ['approved', 'pending'] // Array triggers .in() query
      };
      if (category && category !== 'all') {
        filters.category = category.toLowerCase();
      }
      
      let data = await Place.filter(filters, { 
        orderBy: { column: 'rating', ascending: false }, 
        limit: 200 // Get more to filter by search and radius
      });
      
      // Filter by search query if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        
        // First, check if we have cached results from the Home page search
        const cachedPlaces = getCachedPlaces(searchQuery);
        
        if (cachedPlaces.length > 0) {
          console.log('📦 [PLACES] Using cached places:', cachedPlaces.length);
          // Merge cached places with DB results (cached takes priority for fresh data)
          const dbIds = new Set(data.map(p => p.google_place_id || p.id).filter(Boolean));
          const newFromCache = cachedPlaces.filter(p => {
            const id = p.google_place_id || p.id;
            return !dbIds.has(id);
          });
          data = [...data, ...newFromCache];
        } else {
          // No cache - filter DB results by text match
          data = (data || []).filter(place => {
            // Check basic fields
            if (place.name?.toLowerCase().includes(query)) return true;
            if (place.description?.toLowerCase().includes(query)) return true;
            if (place.address?.toLowerCase().includes(query)) return true;
            if (place.category?.toLowerCase().includes(query)) return true;
            
            // Check Google place data for types
            if (place.google_place_data) {
              const gpd = place.google_place_data;
              if (gpd.types?.some(t => t.toLowerCase().includes(query))) return true;
              if (gpd.primaryType?.toLowerCase().includes(query)) return true;
              if (gpd.editorials_summary?.toLowerCase().includes(query)) return true;
            }
            
            return false;
          });

          // Only search Google if we have NO cached results (fallback)
          if (data.length < 5) {
            try {
              console.log('📦 [PLACES] No cache, searching Google...');
              const radiusMiles = parseFloat(radius) || 5;
              const googleResults = await searchPlaces({
                query: searchQuery,
                location: campusLocation,
                radius: radiusMiles * 1609.34
              });

              if (googleResults?.length > 0) {
                const existingIds = new Set(data.map(p => p.google_place_id).filter(Boolean));
                const newGooglePlaces = googleResults.filter(gp => !existingIds.has(gp.google_place_id));
                
                for (const gp of newGooglePlaces.slice(0, 15)) {
                  try {
                    const existing = await Place.filter({ google_place_id: gp.google_place_id });
                    if (existing?.length > 0) {
                      data.push(existing[0]);
                    } else {
                      const newPlace = await Place.createFromGooglePlace(gp, user?.selected_campus_id);
                      if (newPlace) data.push(newPlace);
                    }
                  } catch (err) {
                    console.warn('Error creating place:', gp.name, err);
                  }
                }
              }
            } catch (err) {
              console.warn('Google search failed:', err);
            }
          }
        }
      }

      // Always filter by radius to only show nearby places
      if (radius !== 'all' && data.length > 0) {
        data = filterByRadius(
          data || [],
          campusLocation.lat,
          campusLocation.lng,
          parseFloat(radius)
        );
      }

      // Remove duplicates (by google_place_id or id)
      const seen = new Set();
      data = data.filter(place => {
        const key = place.google_place_id || place.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Apply relevance filtering if there's a search query
      if (searchQuery) {
        data = filterByRelevance(data, searchQuery, 15);
        console.log(`🔍 [PLACES] Relevance filter applied: ${data.length} relevant results`);
      }

      // Limit results after filtering
      setPlaces((data || []).slice(0, 50));
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
            {searchQuery ? `Places: "${searchQuery}"` : 'Places'}
          </h1>
          <p className="text-gray-600">
            {searchQuery 
              ? `Showing results for "${searchQuery}" near campus`
              : 'Find the best spots in and around campus'}
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="restaurant">Restaurants</SelectItem>
                    <SelectItem value="cafe">Cafes</SelectItem>
                    <SelectItem value="bar">Bars</SelectItem>
                    <SelectItem value="gym">Gym</SelectItem>
                    <SelectItem value="library">Library</SelectItem>
                    <SelectItem value="study_spot">Study Spots</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="2">2 miles</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </motion.div>

        {/* Map View */}
        {view === 'map' && !loading && places.length > 0 && (
          <ResultsMapView 
            items={places} 
            itemType="place" 
            center={campusCenter || { lat: 42.3770, lng: -71.1167 }} // Default to Harvard if no campus
            radiusMiles={radius}
          />
        )}

        {/* Places Grid */}
        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-4'}>
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className={view === 'grid' ? 'aspect-[4/5] rounded-2xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : places.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

