import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, SavedItem, Campus, SiteSetting } from '@/api/entities';
import HeroSection from '../components/home/HeroSection';
import FeaturedSection from '../components/home/FeaturedSection';
import EventCard from '../components/cards/EventCard';
import PlaceCard from '../components/cards/PlaceCard';
import OpportunityCard from '../components/cards/OpportunityCard';
import GroupCard from '../components/cards/GroupCard';
import AuthModal from '../components/auth/AuthModal';
import { Skeleton } from '@/components/ui/skeleton';

export default function Landing() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithPassword, signUp, sendPasswordReset, updatePassword, isAuthenticated, isRegistrationComplete, getCurrentUser, loading: authLoading, profileLoaded } = useAuth();
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState(new Set());
  const [savedPlaceIds, setSavedPlaceIds] = useState(new Set());
  const [savedOppIds, setSavedOppIds] = useState(new Set());
  const [savedGroupIds, setSavedGroupIds] = useState(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [stats, setStats] = useState({
    campusCount: 0,
    eventCount: 0,
    placeCount: 0,
    groupCount: 0
  });
  const [siteSettings, setSiteSettings] = useState({});

  // Redirect authenticated users who haven't completed registration
  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      // Wait for profile to load before checking registration
      if (!profileLoaded) {
        return;
      }
      if (!isRegistrationComplete()) {
        navigate(createPageUrl('Onboarding'));
      }
      // Authenticated users with complete registration can still view the landing page
    }
  }, [authLoading, isAuthenticated, isRegistrationComplete, profileLoaded, navigate]);

  useEffect(() => {
    loadData();
    loadStats();
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    try {
      const all = await SiteSetting.getAll();
      const obj = {};
      (all || []).forEach(s => { obj[s.setting_key] = s.setting_value; });

      // If hero_image_url wasn't explicitly set, fall back to legacy hero_image object
      if (!obj.hero_image_url && obj.hero_image?.url) {
        obj.hero_image_url = obj.hero_image.url;
      }

      setSiteSettings(obj);
    } catch (e) {
      console.error('Error loading site settings:', e);
    }
  };

  const loadStats = async () => {
    try {
      // Fetch counts for stats bar
      const [campusesResult, allEventsResult, allPlacesResult, allGroupsResult] = await Promise.allSettled([
        Campus.list(),
        Event.list(),
        Place.list(),
        InterestGroup.list()
      ]);
      
      setStats({
        campusCount: campusesResult.status === 'fulfilled' ? (campusesResult.value?.length || 0) : 0,
        eventCount: allEventsResult.status === 'fulfilled' ? (allEventsResult.value?.length || 0) : 0,
        placeCount: allPlacesResult.status === 'fulfilled' ? (allPlacesResult.value?.length || 0) : 0,
        groupCount: allGroupsResult.status === 'fulfilled' ? (allGroupsResult.value?.length || 0) : 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

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
        setAuthModalOpen(true);
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

  const handleJoin = () => {
    // If already authenticated, redirect appropriately
    if (isAuthenticated()) {
      if (!isRegistrationComplete()) {
        navigate(createPageUrl('Onboarding'));
      } else {
        navigate(createPageUrl('Home'));
      }
      return;
    }
    
    // Open auth modal
    setAuthModalOpen(true);
  };

  const LoadingSkeleton = () => (
    <>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="min-w-[160px] sm:min-w-[180px] md:min-w-[200px] max-w-[160px] sm:max-w-[240px] md:max-w-[280px] flex-shrink-0">
          <Skeleton className="aspect-[4/5] rounded-2xl" />
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onGoogleSignIn={signInWithGoogle}
        onEmailSignIn={signInWithPassword}
        onEmailSignUp={signUp}
        onPasswordReset={sendPasswordReset}
        onUpdatePassword={updatePassword}
        initialMode="choose-signup"
      />
      <HeroSection
        onJoin={handleJoin}
        stats={stats}
        heroTitle={siteSettings.hero_title}
        heroSubtitle={siteSettings.hero_subtitle}
        heroImageUrl={siteSettings.hero_image_url}
        heroPreTitle={siteSettings.hero_pre_title}
        taglineBar={siteSettings.tagline_bar}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        {/* Interest Groups - First */}
        <FeaturedSection title={siteSettings.groups_section_title || 'Interest Groups'} viewAllLink="Groups">
          {loading ? (
            <LoadingSkeleton />
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <div key={group.id} className="min-w-[160px] sm:min-w-[180px] md:min-w-[200px] max-w-[160px] sm:max-w-[240px] md:max-w-[280px] flex-shrink-0">
                <GroupCard 
                  group={group}
                  onSave={handleSaveGroup}
                  isSaved={savedGroupIds.has(group.id)}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-500">No groups yet</p>
          )}
        </FeaturedSection>

        {/* Featured Events - Second */}
        <FeaturedSection title={siteSettings.events_section_title || 'Featured Events'} viewAllLink="Events">
          {loading ? (
            <LoadingSkeleton />
          ) : events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="min-w-[160px] sm:min-w-[180px] md:min-w-[200px] max-w-[160px] sm:max-w-[240px] md:max-w-[280px] flex-shrink-0">
                <EventCard 
                  event={event} 
                  onSave={handleSaveEvent}
                  isSaved={savedEventIds.has(event.id)}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-500">No events at the moment</p>
          )}
        </FeaturedSection>

        {/* Popular Places - Third */}
        <FeaturedSection title={siteSettings.places_section_title || 'Popular Places'} viewAllLink="Places">
          {loading ? (
            <LoadingSkeleton />
          ) : places.length > 0 ? (
            places.map((place) => (
              <div key={place.id} className="min-w-[160px] sm:min-w-[180px] md:min-w-[200px] max-w-[160px] sm:max-w-[240px] md:max-w-[280px] flex-shrink-0">
                <PlaceCard 
                  place={place}
                  onSave={handleSavePlace}
                  isSaved={savedPlaceIds.has(place.id)}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-500">No places listed yet</p>
          )}
        </FeaturedSection>

        {/* Volunteer / Work - Fourth */}
        <FeaturedSection title={siteSettings.opportunities_section_title || 'Volunteer / Work'} viewAllLink="Opportunities">
          {loading ? (
            <LoadingSkeleton />
          ) : opportunities.length > 0 ? (
            opportunities.map((opp) => (
              <div key={opp.id} className="min-w-[160px] sm:min-w-[180px] md:min-w-[200px] max-w-[160px] sm:max-w-[240px] md:max-w-[280px] flex-shrink-0">
                <OpportunityCard 
                  opportunity={opp}
                  onSave={handleSaveOpp}
                  isSaved={savedOppIds.has(opp.id)}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-500">No opportunities available</p>
          )}
        </FeaturedSection>
      </div>
    </div>
  );
}

