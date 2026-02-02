import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { InterestGroup, SavedItem } from '@/api/entities';
import IntentModule from '../components/explore/IntentModule';
import GroupCard from '../components/cards/GroupCard';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ChevronRight, Heart, Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { getCurrentUser, isAuthenticated, isRegistrationComplete, loading: authLoading, profileLoaded } = useAuth();
  const [groups, setGroups] = useState([]);
  const [savedGroupIds, setSavedGroupIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const user = getCurrentUser();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      // Wait for profile to be loaded before checking registration
      if (!profileLoaded) {
        return; // Wait for profile to load
      }
      if (!isRegistrationComplete()) {
        navigate(createPageUrl('Onboarding'));
        return;
      }
      loadData();
    }
  }, [authLoading, isAuthenticated, isRegistrationComplete, profileLoaded]);

  const loadData = async () => {
    try {
      // Load more groups so we can sort by user interests
      const groupsData = await InterestGroup.filter(
        { status: 'approved' },
        { orderBy: { column: 'member_count', ascending: false }, limit: 20 }
      );
      
      // Get user's interests for sorting
      const userInterests = user?.interests || [];
      
      // Sort groups: matching interests first (by member count), then non-matching (by member count)
      const sortedGroups = (groupsData || []).sort((a, b) => {
        const aMatches = userInterests.includes(a.category);
        const bMatches = userInterests.includes(b.category);
        
        // If one matches and the other doesn't, prioritize the match
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        
        // If both match or both don't, sort by member count (descending)
        return (b.member_count || 0) - (a.member_count || 0);
      });
      
      // Take top 4 after sorting
      setGroups(sortedGroups.slice(0, 4));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      loadSavedItems();
    }
  }, [authLoading, isAuthenticated]);

  const loadSavedItems = async () => {
    try {
      const user = getCurrentUser();
      if (!user?.id) return;
      const saved = await SavedItem.filter({ user_id: user.id, item_type: 'group' });
      if (saved) {
        setSavedGroupIds(new Set(saved.map(s => s.item_id)));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const handleSaveGroup = async (group) => {
    try {
      const user = getCurrentUser();
      if (savedGroupIds.has(group.id)) {
        const saved = await SavedItem.filter({ user_id: user?.id, item_type: 'group', item_id: group.id });
        if (saved && saved.length > 0) {
          await SavedItem.delete(saved[0].id);
          setSavedGroupIds(prev => {
            const next = new Set(prev);
            next.delete(group.id);
            return next;
          });
        }
      } else {
        await SavedItem.create({ user_id: user?.id, item_type: 'group', item_id: group.id });
        setSavedGroupIds(prev => new Set([...prev, group.id]));
      }
    } catch (error) {
      console.error('Error saving group:', error);
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

        {/* Interest Groups Section - At the top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              <span className="block min-[600px]:hidden">Interest Groups:</span>
              <span className="hidden min-[600px]:block">Interest Groups you have demonstrated interest in:</span>
            </h3>
            <Link
              to={createPageUrl('Groups')}
              className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium text-sm"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {loading ? (
              <div className="flex gap-4 overflow-x-auto">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="min-w-[160px] aspect-square rounded-2xl" />
                ))}
              </div>
            ) : groups.length > 0 ? (
              <>
                {/* Mobile List View (< 768px) */}
                <div className="flex flex-col gap-3 md:hidden">
                  {groups.map((group) => (
                    <div key={group.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center gap-3 relative overflow-hidden">
                      <Link to={`${createPageUrl('Detail')}?type=group&id=${group.id}`} className="absolute inset-0 z-0" />

                      <img
                        src={group.image_url || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400'}
                        alt={group.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0 pointer-events-none">
                        <h4 className="font-semibold text-gray-900 truncate pr-2">{group.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Users className="w-3 h-3" />
                          {group.member_count} members
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleSaveGroup(group);
                        }}
                        className="relative z-10 p-2 text-gray-400 hover:text-orange-500 transition-colors"
                      >
                        <Heart className={`w-5 h-5 ${savedGroupIds.has(group.id) ? 'fill-orange-500 text-orange-500' : ''}`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Tablet/Desktop View (>= 768px) */}
                <div className="hidden md:flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onSave={handleSaveGroup}
                      isSaved={savedGroupIds.has(group.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Join groups to see them here
              </p>
            )}
          </div>
        </motion.div>

        {/* Intent Modules */}
        <div className="space-y-6">
          {/* Events Module */}
          <IntentModule
            title="Featured Events"
            prompt="Show me the next events in and around my campus"
            categories={[
              { value: 'all', label: 'All Categories' },
              { value: 'Sports', label: 'Sports' },
              { value: 'Shows', label: 'Shows' },
              { value: 'Talks', label: 'Talks' },
              { value: 'Social', label: 'Social' },
              { value: 'Academic', label: 'Academic' },
              { value: 'Other', label: 'Other' }
            ]}
            showTimeWindow={true}
            showRadius={true}
            initialTimeWindow="any"
            initialRadius="any"
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
              { value: 'all', label: 'All Categories' },
              { value: 'Bars', label: 'Bars' },
              { value: 'Restaurants', label: 'Restaurants' },
              { value: 'Cafes', label: 'Cafes' },
              { value: 'Housing', label: 'Housing' },
              { value: 'Study Spots', label: 'Study Spots' },
              { value: 'Entertainment', label: 'Entertainment' },
              { value: 'Shopping', label: 'Shopping' },
              { value: 'Other', label: 'Other' }
            ]}
            showTimeWindow={false}
            showRadius={true}
            initialRadius="any"
            onSubmit={handlePlacesSubmit}
            previewImage="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400"
            previewTitle="Campus Café"
            previewSubtitle="Find great places near campus"
          />

          {/* Opportunities Module */}
          <IntentModule
            title="Volunteer / Work"
            prompt="Show me opportunities in and around my campus"
            categories={[
              { value: 'all', label: 'All Types' },
              { value: 'Volunteer', label: 'Volunteering' },
              { value: 'Internship', label: 'Internships' },
              { value: 'Work', label: 'Work / Part-time' },
              { value: 'Research', label: 'Research' },
              { value: 'Other', label: 'Other' }
            ]}
            showTimeWindow={true}
            showRadius={true}
            initialTimeWindow="any"
            initialRadius="any"
            onSubmit={handleOpportunitiesSubmit}
            previewImage="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400"
            previewTitle="Meet new friends"
            previewSubtitle="Various opportunities"
          />
        </div>
      </div>
    </div>
  );
}

