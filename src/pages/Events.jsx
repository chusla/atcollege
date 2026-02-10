import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Event, SavedItem, Campus } from '@/api/entities';
import { getBoundingBox, filterByRadius, ANY_DISTANCE_RADIUS_MILES } from '@/utils/geo';
import { searchPlaces, milesToMeters } from '@/api/googlePlaces';
import { getPlaceImageUrl } from '@/utils/imageFallback';
import EventCard from '../components/cards/EventCard';
import EventRowCard from '../components/results/EventRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Filter, ArrowUpDown, SlidersHorizontal, Search, ArrowLeft, Building2, Loader2, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { addWeeks, addMonths, format } from 'date-fns';

// Map search keywords to event category (dropdown values: sports, social, academic, cultural, career, workshop; DB also has Shows, Talks, Other)
const SEARCH_TO_CATEGORY = {
  concert: 'cultural', concerts: 'cultural', music: 'cultural', show: 'cultural', theater: 'cultural', theatre: 'cultural', performance: 'cultural',
  game: 'sports', games: 'sports', sport: 'sports', sports: 'sports', soccer: 'sports', basketball: 'sports', football: 'sports', fitness: 'sports', workout: 'sports', yoga: 'sports',
  talk: 'academic', talks: 'academic', lecture: 'academic', speaker: 'academic', seminar: 'academic',
  party: 'social', social: 'social', meetup: 'social', networking: 'social', happy: 'social',
  academic: 'academic', study: 'academic', research: 'academic', class: 'academic', workshop: 'career', career: 'career', job: 'career', internship: 'career',
  cultural: 'cultural', art: 'cultural', food: 'cultural', volunteer: 'cultural', other: 'cultural'
};

function searchTermToCategory(searchText) {
  if (!searchText || !searchText.trim()) return null;
  const word = searchText.trim().toLowerCase().replace(/\s+/g, ' ');
  const direct = SEARCH_TO_CATEGORY[word];
  if (direct) return direct;
  for (const [key, cat] of Object.entries(SEARCH_TO_CATEGORY)) {
    if (word.includes(key)) return cat;
  }
  return null;
}

export default function Events() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, getCurrentUser, signInWithGoogle, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');

  const [category, setCategory] = useState(() => searchParams.get('category') || 'all');
  const [timeWindow, setTimeWindow] = useState(() => searchParams.get('timeWindow') || 'any');
  const [radius, setRadius] = useState(() => searchParams.get('radius') || '5');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('name_asc');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [googleListings, setGoogleListings] = useState([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Sync URL with state when search/category/radius/timeWindow change
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (category && category !== 'all') next.set('category', category); else next.delete('category');
    if (timeWindow && timeWindow !== 'any') next.set('timeWindow', timeWindow); else next.delete('timeWindow');
    if (radius && radius !== '5') next.set('radius', radius); else next.delete('radius');
    if (searchQuery && searchQuery.trim()) next.set('search', searchQuery.trim()); else next.delete('search');
    setSearchParams(next, { replace: true });
  }, [category, timeWindow, radius, searchQuery]);

  // When URL has search param on load, optionally set category from search words
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && !searchParams.get('category')) {
      const mapped = searchTermToCategory(urlSearch);
      if (mapped) setCategory(mapped);
    }
  }, []);

  // Always fetch campus location when user has a campus (so results are constrained geographically)
  useEffect(() => {
    if (isAuthenticated() && (profile?.selected_campus_id ?? profile?.campus_id)) {
      fetchCampusLocation();
    }
  }, [isAuthenticated(), profile?.selected_campus_id, profile?.campus_id]);

  useEffect(() => {
    loadEvents();
    loadSavedItems();
  }, [category, timeWindow, sortBy, userLocation, radius, searchQuery]);

  // Load Google Places listings (venues & things to do) to help populate the page
  useEffect(() => {
    if (!userLocation) return;
    const effectiveMiles = radius === 'any' ? ANY_DISTANCE_RADIUS_MILES : parseFloat(radius);
    const radiusMeters = milesToMeters(effectiveMiles);
    const query = (searchQuery && searchQuery.trim()) ? searchQuery.trim() : 'events venues things to do';
    setLoadingGoogle(true);
    searchPlaces(query, { lat: userLocation.lat, lng: userLocation.lng }, radiusMeters)
      .then((results) => setGoogleListings(results || []))
      .catch((err) => {
        console.warn('Google Places search for events page:', err);
        setGoogleListings([]);
      })
      .finally(() => setLoadingGoogle(false));
  }, [userLocation, radius, searchQuery]);

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
              lat: campus.latitude,
              lng: campus.longitude
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

  const loadEvents = async () => {
    setLoading(true);
    try {
      const filters = { status: 'approved' };
      // DB uses PascalCase: Sports, Shows, Talks, Social, Academic, Other
      const effectiveCategory = category && category !== 'all' ? category : (searchQuery && searchTermToCategory(searchQuery));
      if (effectiveCategory) {
        const dbCategory = { sports: 'Sports', social: 'Social', academic: 'Academic', cultural: 'Other', career: 'Academic', workshop: 'Academic', shows: 'Shows', talks: 'Talks', other: 'Other' }[effectiveCategory.toLowerCase()] || effectiveCategory;
        filters.category = dbCategory;
      }

      // Campus filter - show events for the user's campus only
      const user = isAuthenticated() ? getCurrentUser() : null;
      const campusId = user?.selected_campus_id;
      if (campusId) {
        filters.campus_id = campusId;
      }

      // Don't filter by lat/lng in the API - many events have no coordinates and would be excluded.
      // We'll filter by radius client-side and include events without coords so the list isn't empty.
      const effectiveRadiusMiles = userLocation
        ? (radius === 'any' ? ANY_DISTANCE_RADIUS_MILES : parseFloat(radius))
        : null;

      // Date window filter
      const today = new Date();
      let endDate;
      let dateFilter = [];

      switch (timeWindow) {
        case 'today':
          endDate = today;
          break;
        case '1week':
          endDate = addWeeks(today, 1);
          break;
        case '2weeks':
          endDate = addWeeks(today, 2);
          break;
        case '3months':
          endDate = addMonths(today, 3);
          break;
        case '1month':
          endDate = addMonths(today, 1);
          break;
        case 'any':
        default:
          endDate = null;
      }

      if (timeWindow === 'any') {
        dateFilter = [{ operator: 'gte', value: format(today, 'yyyy-MM-dd') }];
      } else {
        dateFilter = [
          { operator: 'gte', value: format(today, 'yyyy-MM-dd') },
          { operator: 'lte', value: format(endDate, 'yyyy-MM-dd') }
        ];
      }

      filters.date = dateFilter;

      let orderBy = { column: 'title', ascending: true }; // Default name_asc

      switch (sortBy) {
        case 'name_desc':
          orderBy = { column: 'title', ascending: false };
          break;
        case 'date_asc':
          orderBy = { column: 'date', ascending: true };
          break;
        case 'date_desc':
          orderBy = { column: 'date', ascending: false };
          break;
        case 'name_asc':
        default:
          orderBy = { column: 'title', ascending: true };
      }

      const opts = { orderBy, limit: 50, searchQuery: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined };
      let data;
      if (campusId && opts.searchQuery) {
        // When there's a search query AND campus, use the campus-aware search method
        data = await Event.filterWithCampusOrNull(campusId, filters, opts);
      } else {
        // Strict campus filter — only show events matching the user's campus
        data = await Event.filter(filters, opts);
      }
      data = data || [];

      // When not using campus filter, apply search text client-side (API has no search in generic filter)
      const q = opts.searchQuery;
      if (!campusId && q) {
        const lower = q.toLowerCase();
        data = data.filter(e => (e.title && e.title.toLowerCase().includes(lower)) || (e.description && e.description.toLowerCase().includes(lower)));
      }

      // Client-side: events with coords filter by radius; events without coords still show (campus-scoped)
      let withCoords = (data || []).filter(e => e.latitude != null && e.longitude != null);
      let withoutCoords = (data || []).filter(e => e.latitude == null || e.longitude == null);
      if (userLocation && effectiveRadiusMiles != null && effectiveRadiusMiles > 0) {
        withCoords = filterByRadius(withCoords, userLocation.lat, userLocation.lng, effectiveRadiusMiles);
      }
      const combined = [...withCoords, ...withoutCoords];
      const byDate = (a, b) => (new Date(a.date) - new Date(b.date));
      combined.sort((a, b) => byDate(a, b));

      setEvents(combined);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedItems = async () => {
    try {
      if (isAuthenticated()) {
        const user = getCurrentUser();
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'event' });
        setSavedIds(new Set((saved || []).map(s => s.item_id)));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const handleSave = async (event) => {
    try {
      if (!isAuthenticated()) {
        signInWithGoogle();
        return;
      }

      const user = getCurrentUser();
      if (savedIds.has(event.id)) {
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'event', item_id: event.id });
        if (saved && saved.length > 0) {
          await SavedItem.delete(saved[0].id);
          setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(event.id);
            return next;
          });
        }
      } else {
        await SavedItem.create({ user_id: user?.id, item_type: 'event', item_id: event.id });
        setSavedIds(prev => new Set([...prev, event.id]));
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + Search */}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600 mb-4">Discover what's happening in and around campus</p>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by keyword or category (e.g. concert, sports, lecture, social)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-lg border-gray-200"
            />
          </div>
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
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="shows">Shows</SelectItem>
                    <SelectItem value="talks">Talks</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="career">Career</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={timeWindow} onValueChange={setTimeWindow}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="1week">This week</SelectItem>
                    <SelectItem value="2weeks">2 weeks</SelectItem>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="3months">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500 shrink-0" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                    <SelectItem value="date_asc">Date (Ascending)</SelectItem>
                    <SelectItem value="date_desc">Date (Descending)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="w-fit">
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          </div>
        </motion.div >

        {/* Map View */}
        {
          view === 'map' && !loading && events.length > 0 && (
            <ResultsMapView items={events} itemType="event" />
          )
        }

        {/* Events Grid/List */}
        {
          loading ? (
            <div className={view === 'grid' ? 'grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-4'}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className={view === 'grid' ? 'aspect-[4/5] rounded-2xl' : 'h-28 rounded-xl'} />
              ))}
            </div>
          ) : events.length > 0 ? (
            view === 'grid' ? (
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSave={handleSave}
                    isSaved={savedIds.has(event.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <EventRowCard
                    key={event.id}
                    event={event}
                    onSave={handleSave}
                    isSaved={savedIds.has(event.id)}
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
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Nothing nearby right now</h3>
              <p className="text-gray-500">Check back later for new events</p>
            </motion.div>
          )
        }

        {/* Venues & things to do from Google (helps populate the page) */}
        {(userLocation && (googleListings.length > 0 || loadingGoogle)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 pt-8 border-t border-gray-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Venues & things to do nearby</h2>
              {loadingGoogle && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  From Google…
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Places and venues near campus that might host events. View full details on the Places page.
            </p>
            {loadingGoogle ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {googleListings.slice(0, 12).map((place) => {
                  const imageUrl = getPlaceImageUrl(place, 200);
                  return (
                  <Link
                    key={place.google_place_id || place.id || place.name}
                    to={`${createPageUrl('Places')}?search=${encodeURIComponent(place.name || '')}&radius=${radius}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:shadow-sm transition-all text-left"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 ${imageUrl ? 'hidden' : ''}`}>
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{place.name}</p>
                      {place.address && (
                        <p className="text-xs text-gray-500 truncate">{place.address}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </Link>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div >
    </div >
  );
}

