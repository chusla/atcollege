import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { SavedItem, Event, Place, Opportunity, InterestGroup } from '@/api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventCard from '../components/cards/EventCard';
import PlaceCard from '../components/cards/PlaceCard';
import OpportunityCard from '../components/cards/OpportunityCard';
import GroupCard from '../components/cards/GroupCard';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Calendar, Building2, Briefcase, Users } from 'lucide-react';

export default function Saved() {
  const navigate = useNavigate();
  const { isAuthenticated, getCurrentUser, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = getCurrentUser();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      loadSavedItems();
    }
  }, [authLoading]);

  const loadSavedItems = async () => {
    setLoading(true);
    try {
      const saved = await SavedItem.filter({ user_id: user?.id });

      // Load full data for each saved item type
      const eventIds = (saved || []).filter(s => s.item_type === 'event').map(s => s.item_id);
      const placeIds = (saved || []).filter(s => s.item_type === 'place').map(s => s.item_id);
      const oppIds = (saved || []).filter(s => s.item_type === 'opportunity').map(s => s.item_id);
      const groupIds = (saved || []).filter(s => s.item_type === 'group').map(s => s.item_id);

      const [allEvents, allPlaces, allOpps, allGroups] = await Promise.all([
        Event.list(),
        Place.list(),
        Opportunity.list(),
        InterestGroup.list()
      ]);

      setEvents((allEvents || []).filter(e => eventIds.includes(e.id)));
      setPlaces((allPlaces || []).filter(p => placeIds.includes(p.id)));
      setOpportunities((allOpps || []).filter(o => oppIds.includes(o.id)));
      setGroups((allGroups || []).filter(g => groupIds.includes(g.id)));
    } catch (error) {
      console.error('Error loading saved items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (type, itemId) => {
    try {
      const saved = await SavedItem.filter({ user_id: user?.id, item_type: type, item_id: itemId });
      if (saved && saved.length > 0) {
        await SavedItem.delete(saved[0].id);
        // Refresh the list
        loadSavedItems();
      }
    } catch (error) {
      console.error('Error unsaving item:', error);
    }
  };

  const EmptyState = ({ icon: Icon, title, subtitle }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-12"
    >
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-gray-700 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </motion.div>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved</h1>
          <p className="text-gray-600">Your bookmarked events, places, and more</p>
        </motion.div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="bg-white border border-gray-200 rounded-xl p-1 mb-6">
            <TabsTrigger value="events" className="rounded-lg px-4">
              <Calendar className="w-4 h-4 mr-2" />
              Events ({events.length})
            </TabsTrigger>
            <TabsTrigger value="places" className="rounded-lg px-4">
              <Building2 className="w-4 h-4 mr-2" />
              Places ({places.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="rounded-lg px-4">
              <Briefcase className="w-4 h-4 mr-2" />
              Opportunities ({opportunities.length})
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg px-4">
              <Users className="w-4 h-4 mr-2" />
              Groups ({groups.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            {events.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSave={() => handleUnsave('event', event.id)}
                    isSaved={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No saved events"
                subtitle="Browse events and tap the heart to save them"
              />
            )}
          </TabsContent>

          <TabsContent value="places">
            {places.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {places.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    onSave={() => handleUnsave('place', place.id)}
                    isSaved={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No saved places"
                subtitle="Discover places and save your favorites"
              />
            )}
          </TabsContent>

          <TabsContent value="opportunities">
            {opportunities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {opportunities.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onSave={() => handleUnsave('opportunity', opp.id)}
                    isSaved={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No saved opportunities"
                subtitle="Find opportunities and bookmark them for later"
              />
            )}
          </TabsContent>

          <TabsContent value="groups">
            {groups.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onSave={() => handleUnsave('group', group.id)}
                    isSaved={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No saved groups"
                subtitle="Join groups to connect with others"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

