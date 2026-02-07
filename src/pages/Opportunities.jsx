import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Opportunity, SavedItem, Campus } from '@/api/entities';
import { getBoundingBox, filterByRadius, ANY_DISTANCE_RADIUS_MILES } from '@/utils/geo';
import OpportunityCard from '../components/cards/OpportunityCard';
import OpportunityRowCard from '../components/results/OpportunityRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MapPin, Filter, Briefcase, Calendar, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { addWeeks, addMonths, format } from 'date-fns';

export default function Opportunities() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle, profile } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const [type, setType] = useState(urlParams.get('type') || 'all');
  const [timeWindow, setTimeWindow] = useState(urlParams.get('timeWindow') || 'any');
  const [radius, setRadius] = useState(urlParams.get('radius') || '5');
  const [sortBy, setSortBy] = useState('oldest');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Always fetch campus location when user has a campus (geographic constraint)
  useEffect(() => {
    if (isAuthenticated() && (profile?.selected_campus_id ?? profile?.campus_id)) {
      fetchCampusLocation();
    }
  }, [isAuthenticated(), profile?.selected_campus_id, profile?.campus_id]);

  useEffect(() => {
    loadOpportunities();
    loadSavedItems();
  }, [type, timeWindow, radius, userLocation, sortBy]);

  const getUserLocation = () => {
    // App is campus-centered, not user-location centered
    // Always use the user's selected campus location for consistent results
    fetchCampusLocation();
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

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const filters = { status: 'approved' };
      if (type && type !== 'all') {
        filters.type = type.toLowerCase();
      }

      // Campus filter - filter by user's selected campus
      const user = isAuthenticated() ? getCurrentUser() : null;
      const campusId = user?.selected_campus_id;
      if (campusId) {
        filters.campus_id = campusId;
      }

      // Geographic constraint: campus center + radius (use 50 mi when "any")
      const effectiveRadiusMiles = userLocation
        ? (radius === 'any' || radius === 'all' ? ANY_DISTANCE_RADIUS_MILES : parseFloat(radius))
        : null;
      if (userLocation && effectiveRadiusMiles != null && effectiveRadiusMiles > 0) {
        const bbox = getBoundingBox(userLocation.lat, userLocation.lng, effectiveRadiusMiles);
        filters.latitude = [
          { operator: 'gte', value: bbox.minLat },
          { operator: 'lte', value: bbox.maxLat }
        ];
        filters.longitude = [
          { operator: 'gte', value: bbox.minLng },
          { operator: 'lte', value: bbox.maxLng }
        ];
      }

      // Date window filter based on deadline
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999); // End of today

      let dateFilter = [];

      switch (timeWindow) {
        case 'today':
          dateFilter = [
            { operator: 'gte', value: today.toISOString() },
            { operator: 'lte', value: todayEnd.toISOString() }
          ];
          break;
        case '1week':
          dateFilter = [
            { operator: 'gte', value: today.toISOString() },
            { operator: 'lte', value: addWeeks(today, 1).toISOString() }
          ];
          break;
        case '2weeks':
          dateFilter = [
            { operator: 'gte', value: today.toISOString() },
            { operator: 'lte', value: addWeeks(today, 2).toISOString() }
          ];
          break;
        case '1month':
          dateFilter = [
            { operator: 'gte', value: today.toISOString() },
            { operator: 'lte', value: addMonths(today, 1).toISOString() }
          ];
          break;
        case '3months':
          dateFilter = [
            { operator: 'gte', value: today.toISOString() },
            { operator: 'lte', value: addMonths(today, 3).toISOString() }
          ];
          break;
        case 'no_deadline':
          filters.deadline = null; // Special handling for null
          break;
        case 'any':
        default:
          // For 'any', we want to show everything, including past deadlines? 
          // Usually 'Any time' in opportunities means 'Active' ones.
          // But let's stick to "All".
          // If we want to hide expired ones, we should add deadline >= today OR null.
          // The previous Events logic filtered FUTURE events.
          // For opportunities, let's assume we want valid ones.
          // filters.or = `deadline.is.null,deadline.gte.${today.toISOString()}`;
          // But wait, the `filter` helper might not support complex OR easily in this structure without raw query modification.
          // Let's look at `listFeatured` in entities.js: `.or(deadline.is.null,deadline.gte.${today})`
          // We can try to replicate that or just fetch strict for now.
          // User asked for "Any time", implies "All active".
          // Let's leave it open (fetch all based on status='approved') for 'any'.
          break;
      }

      if (dateFilter.length > 0) {
        filters.deadline = dateFilter;
      }

      let orderBy = { column: 'deadline', ascending: true }; // Default soonest? Or usually newest created? 
      // If default is 'newest' (which maps to latest deadline desc), that might hide immediate ones.
      // Usually default is 'Soonest'.
      // Let's ensure default is handled.

      switch (sortBy) {
        case 'name_asc':
          orderBy = { column: 'title', ascending: true };
          break;
        case 'name_desc':
          orderBy = { column: 'title', ascending: false };
          break;
        case 'oldest':
          // Oldest means "Soonest" in deadline terms (Smallest date)
          orderBy = { column: 'deadline', ascending: true };
          break;
        case 'newest':
          // Newest means "Latest" in deadline terms (Largest date)
          orderBy = { column: 'deadline', ascending: false };
          break;
        default:
          orderBy = { column: 'deadline', ascending: true }; // Default to soonest
      }

      const data = await Opportunity.filter(filters, {
        orderBy: orderBy,
        limit: 100
      });

      let results = data || [];

      // Post-filter by precise radius (Haversine) and add distance
      if (userLocation && effectiveRadiusMiles != null && effectiveRadiusMiles > 0) {
        results = filterByRadius(
          results,
          userLocation.lat,
          userLocation.lng,
          effectiveRadiusMiles
        );
      }

      setOpportunities(results.slice(0, 50));
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedItems = async () => {
    try {
      if (isAuthenticated()) {
        const user = getCurrentUser();
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'opportunity' });
        setSavedIds(new Set((saved || []).map(s => s.item_id)));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const handleSave = async (opportunity) => {
    try {
      if (!isAuthenticated()) {
        signInWithGoogle();
        return;
      }

      const user = getCurrentUser();
      if (savedIds.has(opportunity.id)) {
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'opportunity', item_id: opportunity.id });
        if (saved && saved.length > 0) {
          await SavedItem.delete(saved[0].id);
          setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(opportunity.id);
            return next;
          });
        }
      } else {
        await SavedItem.create({ user_id: user?.id, item_type: 'opportunity', item_id: opportunity.id });
        setSavedIds(prev => new Set([...prev, opportunity.id]));
      }
    } catch (error) {
      console.error('Error saving opportunity:', error);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer / Work</h1>
          <p className="text-gray-600">Find opportunities to get involved</p>
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
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="volunteer">Volunteering</SelectItem>
                    <SelectItem value="internship">Internships</SelectItem>
                    <SelectItem value="job">Jobs</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={timeWindow} onValueChange={setTimeWindow}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="1week">This week</SelectItem>
                    <SelectItem value="2weeks">2 weeks</SelectItem>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="3months">3 months</SelectItem>
                    <SelectItem value="no_deadline">No deadline</SelectItem>
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

              {/* Sort Filter */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oldest">Deadline (Soonest)</SelectItem>
                    <SelectItem value="newest">Deadline (Latest)</SelectItem>
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
        {view === 'map' && !loading && opportunities.length > 0 && (
          <ResultsMapView items={opportunities} itemType="opportunity" />
        )}

        {/* Opportunities Grid */}
        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-4'}>
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className={view === 'grid' ? 'aspect-[4/5] rounded-2xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : opportunities.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onSave={handleSave}
                  isSaved={savedIds.has(opp.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp) => (
                <OpportunityRowCard
                  key={opp.id}
                  opportunity={opp}
                  onSave={handleSave}
                  isSaved={savedIds.has(opp.id)}
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
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No opportunities right now</h3>
            <p className="text-gray-500">Check back later for new openings</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

