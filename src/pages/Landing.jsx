import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, SavedItem } from '@/api/entities';
import HeroSection from '../components/home/HeroSection';
import FeaturedSection from '../components/home/FeaturedSection';
import EventCard from '../components/cards/EventCard';
import PlaceCard from '../components/cards/PlaceCard';
import OpportunityCard from '../components/cards/OpportunityCard';
import GroupCard from '../components/cards/GroupCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Landing() {
  const navigate = useNavigate();
  const { signInWithGoogle, isAuthenticated, isRegistrationComplete, getCurrentUser, loading: authLoading, profileLoaded } = useAuth();
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState(new Set());
  const [savedPlaceIds, setSavedPlaceIds] = useState(new Set());
  const [savedOppIds, setSavedOppIds] = useState(new Set());
  const [savedGroupIds, setSavedGroupIds] = useState(new Set());

  // Redirect authenticated users appropriately
  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      // Wait for profile to load before checking registration
      if (!profileLoaded) {
        return;
      }
      if (!isRegistrationComplete()) {
        navigate(createPageUrl('Onboarding'));
      } else {
        navigate(createPageUrl('Home'));
      }
    }
  }, [authLoading, isAuthenticated, isRegistrationComplete, profileLoaded, navigate]);

  useEffect(() => {
    loadData();
  }, []);

  // Load saved items when auth state changes
  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      loadSavedItems();
    }
  }, [authLoading, isAuthenticated]);

  const loadSavedItems = async () => {
    try {
      const user = getCurrentUser();
      if (!user?.id) return;
      
      const saved = await SavedItem.filter({ user_id: user.id });
      if (saved) {
        setSavedEventIds(new Set(saved.filter(s => s.item_type === 'event').map(s => s.item_id)));
        setSavedPlaceIds(new Set(saved.filter(s => s.item_type === 'place').map(s => s.item_id)));
        setSavedOppIds(new Set(saved.filter(s => s.item_type === 'opportunity').map(s => s.item_id)));
        setSavedGroupIds(new Set(saved.filter(s => s.item_type === 'group').map(s => s.item_id)));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const handleSave = async (itemType, item, savedIds, setSavedIds) => {
    try {
      if (!isAuthenticated()) {
        signInWithGoogle();
        return;
      }

      const user = getCurrentUser();
      const itemId = item.id;
      
      if (savedIds.has(itemId)) {
        // Unsave
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: itemType, item_id: itemId });
        if (saved && saved.length > 0) {
          await SavedItem.delete(saved[0].id);
          setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }
      } else {
        // Save
        await SavedItem.create({ user_id: user?.id, item_type: itemType, item_id: itemId });
        setSavedIds(prev => new Set([...prev, itemId]));
      }
    } catch (error) {
      console.error(`Error saving ${itemType}:`, error);
    }
  };

  const handleSaveEvent = (event) => handleSave('event', event, savedEventIds, setSavedEventIds);
  const handleSavePlace = (place) => handleSave('place', place, savedPlaceIds, setSavedPlaceIds);
  const handleSaveOpp = (opp) => handleSave('opportunity', opp, savedOppIds, setSavedOppIds);
  const handleSaveGroup = (group) => handleSave('group', group, savedGroupIds, setSavedGroupIds);

  const loadData = async () => {
    try {
      // Fetch each independently so one failure doesn't block others
      const [eventsResult, placesResult, oppsResult, groupsResult] = await Promise.allSettled([
        Event.listFeatured(null, 6),
        Place.listFeatured(null, 6),
        Opportunity.listFeatured(null, 6),
        InterestGroup.listFeatured(null, 8)
      ]);
      
      setEvents(eventsResult.status === 'fulfilled' ? eventsResult.value || [] : []);
      setPlaces(placesResult.status === 'fulfilled' ? placesResult.value || [] : []);
      setOpportunities(oppsResult.status === 'fulfilled' ? oppsResult.value || [] : []);
      setGroups(groupsResult.status === 'fulfilled' ? groupsResult.value || [] : []);
      
      // Log any failures for debugging
      [eventsResult, placesResult, oppsResult, groupsResult].forEach((result, i) => {
        if (result.status === 'rejected') {
          console.error(`Failed to load ${['events', 'places', 'opportunities', 'groups'][i]}:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    // If already authenticated, redirect appropriately
    if (isAuthenticated()) {
      if (!isRegistrationComplete()) {
        navigate(createPageUrl('Onboarding'));
      } else {
        navigate(createPageUrl('Home'));
      }
      return;
    }
    
    // Otherwise, sign in with Google
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleExplore = () => {
    navigate(createPageUrl('Events'));
  };

  const LoadingSkeleton = () => (
    <>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="min-w-[200px] max-w-[280px]">
          <Skeleton className="aspect-[4/5] rounded-2xl" />
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection onJoin={handleJoin} onExplore={handleExplore} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Events */}
        <FeaturedSection title="Featured Events" viewAllLink="Events">
          {loading ? (
            <LoadingSkeleton />
          ) : events.length > 0 ? (
            events.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onSave={handleSaveEvent}
                isSaved={savedEventIds.has(event.id)}
              />
            ))
          ) : (
            <p className="text-gray-500">No events at the moment</p>
          )}
        </FeaturedSection>

        {/* Popular Places */}
        <FeaturedSection title="Popular Places" viewAllLink="Places">
          {loading ? (
            <LoadingSkeleton />
          ) : places.length > 0 ? (
            places.map((place) => (
              <PlaceCard 
                key={place.id} 
                place={place}
                onSave={handleSavePlace}
                isSaved={savedPlaceIds.has(place.id)}
              />
            ))
          ) : (
            <p className="text-gray-500">No places listed yet</p>
          )}
        </FeaturedSection>

        {/* Volunteer / Work */}
        <FeaturedSection title="Volunteer / Work" viewAllLink="Opportunities">
          {loading ? (
            <LoadingSkeleton />
          ) : opportunities.length > 0 ? (
            opportunities.map((opp) => (
              <OpportunityCard 
                key={opp.id} 
                opportunity={opp}
                onSave={handleSaveOpp}
                isSaved={savedOppIds.has(opp.id)}
              />
            ))
          ) : (
            <p className="text-gray-500">No opportunities available</p>
          )}
        </FeaturedSection>

        {/* Interest Groups */}
        <FeaturedSection title="Interest Groups" viewAllLink="Groups">
          {loading ? (
            <LoadingSkeleton />
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <GroupCard 
                key={group.id} 
                group={group}
                onSave={handleSaveGroup}
                isSaved={savedGroupIds.has(group.id)}
              />
            ))
          ) : (
            <p className="text-gray-500">No groups yet</p>
          )}
        </FeaturedSection>
      </div>
    </div>
  );
}

