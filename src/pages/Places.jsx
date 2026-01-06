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
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { MapPin, Filter, Building2 } from 'lucide-react';

export default function Places() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle } = useAuth();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');

  const urlParams = new URLSearchParams(window.location.search);
  const [category, setCategory] = useState(urlParams.get('category') || 'all');
  const [radius, setRadius] = useState(urlParams.get('radius') || '5');

  useEffect(() => {
    loadPlaces();
    loadSavedItems();
  }, [category]);

  const loadPlaces = async () => {
    setLoading(true);
    try {
      // Get user's campus location
      let campusLocation = null;
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

      const filters = { status: 'approved' };
      if (category && category !== 'all') {
        filters.category = category.toLowerCase();
      }
      
      let data = await Place.filter(filters, { 
        orderBy: { column: 'rating', ascending: false }, 
        limit: 100 // Get more to filter by radius
      });

      // Filter by radius if campus location and radius specified
      if (campusLocation && radius !== 'all') {
        data = filterByRadius(
          data || [],
          campusLocation.lat,
          campusLocation.lng,
          parseFloat(radius)
        );
      }

      // Limit results after radius filtering
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Places</h1>
          <p className="text-gray-600">Find the best spots in and around campus</p>
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
          <ResultsMapView items={places} itemType="place" />
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

