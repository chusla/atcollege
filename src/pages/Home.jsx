import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup } from '@/api/entities';
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

  const handleSearch = async (query, radius) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults({
        events: [], places: [], opportunities: [], groups: [],
        eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
      });
      return;
    }

    setSearchLoading(true);
    try {
      const [allEvents, allPlaces, allOpps, allGroups] = await Promise.all([
        Event.filter({ status: 'approved' }),
        Place.filter({ status: 'approved' }),
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
        places: filteredPlaces.slice(0, 5),
        opportunities: filteredOpps.slice(0, 5),
        groups: filteredGroups.slice(0, 5),
        eventsCount: filteredEvents.length,
        placesCount: filteredPlaces.length,
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

