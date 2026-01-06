import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup } from '@/api/entities';
import HeroSection from '../components/home/HeroSection';
import FeaturedSection from '../components/home/FeaturedSection';
import EventCard from '../components/cards/EventCard';
import PlaceCard from '../components/cards/PlaceCard';
import OpportunityCard from '../components/cards/OpportunityCard';
import GroupCard from '../components/cards/GroupCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Landing() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
              <EventCard key={event.id} event={event} />
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
              <PlaceCard key={place.id} place={place} />
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
              <OpportunityCard key={opp.id} opportunity={opp} />
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
              <GroupCard key={group.id} group={group} />
            ))
          ) : (
            <p className="text-gray-500">No groups yet</p>
          )}
        </FeaturedSection>
      </div>
    </div>
  );
}

