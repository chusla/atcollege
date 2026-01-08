import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Event, SavedItem } from '@/api/entities';
import EventCard from '../components/cards/EventCard';
import EventRowCard from '../components/results/EventRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Filter, ArrowUpDown } from 'lucide-react';
import { addWeeks, addMonths, format } from 'date-fns';

export default function Events() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');

  const urlParams = new URLSearchParams(window.location.search);
  const [category, setCategory] = useState(urlParams.get('category') || 'all');
  // Changed default to 'any'
  const [timeWindow, setTimeWindow] = useState(urlParams.get('timeWindow') || 'any');
  const [radius, setRadius] = useState(urlParams.get('radius') || '5');
  const [sortBy, setSortBy] = useState('name_asc');

  useEffect(() => {
    loadEvents();
    loadSavedItems();
  }, [category, timeWindow, sortBy]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const filters = { status: 'approved' };
      if (category && category !== 'all') {
        filters.category = category.toLowerCase();
      }

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

      const data = await Event.filter(filters, {
        orderBy: orderBy,
        limit: 20
      });
      setEvents(data || []);
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">Discover what's happening in and around campus</p>
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
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="career">Career</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={timeWindow} onValueChange={setTimeWindow}>
                  <SelectTrigger className="w-32">
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

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36">
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
            <ViewToggle view={view} onViewChange={setView} />
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
            <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-4'}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className={view === 'grid' ? 'aspect-[4/5] rounded-2xl' : 'h-28 rounded-xl'} />
              ))}
            </div>
          ) : events.length > 0 ? (
            view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
      </div >
    </div >
  );
}

