import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { InterestGroup, SavedItem, Campus } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { filterByRadius, ANY_DISTANCE_RADIUS_MILES } from '@/utils/geo';
import GroupCard from '../components/cards/GroupCard';
import GroupRowCard from '../components/results/GroupRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Users, Filter, MapPin, ArrowUpDown, SlidersHorizontal, ArrowLeft } from 'lucide-react';

export default function Groups() {
  const navigate = useNavigate();
  const { isAuthenticated, getCurrentUser, signInWithGoogle, profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const [category, setCategory] = useState(urlParams.get('category') || 'all');
  const [radius, setRadius] = useState(urlParams.get('radius') || 'any');
  const [sortBy, setSortBy] = useState('members');
  const [userLocation, setUserLocation] = useState(null);

  // Fetch campus location for geographic filtering
  useEffect(() => {
    if (isAuthenticated() && (profile?.selected_campus_id ?? profile?.campus_id)) {
      fetchCampusLocation();
    }
  }, [isAuthenticated(), profile?.selected_campus_id, profile?.campus_id]);

  useEffect(() => {
    loadGroups();
    loadSavedItems();
  }, [category, radius, sortBy, userLocation]);

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
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching campus location:', error);
    }
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const filters = { status: 'approved' };

      // Campus filter
      const user = isAuthenticated() ? getCurrentUser() : null;
      const campusId = user?.selected_campus_id;

      // Category filter (server-side)
      if (category && category !== 'all') {
        filters.category = category;
      }

      let orderBy;
      switch (sortBy) {
        case 'name_asc':
          orderBy = { column: 'name', ascending: true };
          break;
        case 'name_desc':
          orderBy = { column: 'name', ascending: false };
          break;
        case 'newest':
          orderBy = { column: 'created_at', ascending: false };
          break;
        case 'members':
        default:
          orderBy = { column: 'member_count', ascending: false };
      }

      let data;
      if (campusId) {
        // Fetch groups for this campus OR with no campus (shared/global groups)
        let query = supabase
          .from('interest_groups')
          .select('*')
          .or(`campus_id.eq.${campusId},campus_id.is.null`);

        // Apply remaining filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
        query = query.limit(100);

        const { data: result, error } = await query;
        if (error) throw error;
        data = result;
      } else {
        data = await InterestGroup.filter(filters, { orderBy, limit: 100 });
      }
      let results = data || [];

      // Client-side radius filter for groups with coordinates
      const useGeoFilter = userLocation && radius !== 'any' && radius !== 'all';
      const effectiveRadiusMiles = useGeoFilter ? parseFloat(radius) : null;

      if (useGeoFilter && effectiveRadiusMiles != null && effectiveRadiusMiles > 0) {
        const withCoords = results.filter(g => g.latitude != null && g.longitude != null);
        const withoutCoords = results.filter(g => g.latitude == null || g.longitude == null);
        const filteredByRadius = filterByRadius(
          withCoords,
          userLocation.lat,
          userLocation.lng,
          effectiveRadiusMiles
        );
        // Only include items without coordinates when radius is large (>= 10 miles)
        // For tight radius filters, users expect geographic precision
        const includeNoCoords = parseFloat(radius) >= 10;
        results = includeNoCoords ? [...filteredByRadius, ...withoutCoords] : [...filteredByRadius];
      }

      setGroups(results);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedItems = async () => {
    try {
      if (isAuthenticated()) {
        const user = getCurrentUser();
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'group' });
        setSavedIds(new Set((saved || []).map(s => s.item_id)));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const handleSave = async (group) => {
    try {
      if (!isAuthenticated()) {
        signInWithGoogle();
        return;
      }

      const user = getCurrentUser();
      if (savedIds.has(group.id)) {
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'group', item_id: group.id });
        if (saved && saved.length > 0) {
          await SavedItem.delete(saved[0].id);
          setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(group.id);
            return next;
          });
        }
      } else {
        await SavedItem.create({ user_id: user?.id, item_type: 'group', item_id: group.id });
        setSavedIds(prev => new Set([...prev, group.id]));
      }
    } catch (error) {
      console.error('Error saving group:', error);
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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interest Groups</h1>
          <p className="text-gray-600">Connect with students who share your interests</p>
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
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Social">Social</SelectItem>
                    <SelectItem value="Volunteering">Volunteering</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Radius Filter */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger className="w-full sm:w-36">
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

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="members">Most Members</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
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
        {view === 'map' && !loading && groups.length > 0 && (
          <ResultsMapView items={groups} itemType="group" />
        )}

        {/* Groups Grid/List */}
        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' : 'space-y-4'}>
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className={view === 'grid' ? 'aspect-square rounded-2xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : groups.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onSave={handleSave}
                  isSaved={savedIds.has(group.id)}
                />
              ))}
            </div>
          ) : view === 'list' ? (
            <div className="space-y-4">
              {groups.map((group) => (
                <GroupRowCard
                  key={group.id}
                  group={group}
                  onSave={handleSave}
                  isSaved={savedIds.has(group.id)}
                />
              ))}
            </div>
          ) : null /* map view handled above */
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No groups yet</h3>
            <p className="text-gray-500">Be the first to start a group!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
