import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { InterestGroup, SavedItem } from '@/api/entities';
import GroupCard from '../components/cards/GroupCard';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

export default function Groups() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    loadGroups();
    loadSavedItems();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await InterestGroup.filter(
        { status: 'approved' },
        { orderBy: { column: 'member_count', ascending: false }, limit: 50 }
      );
      setGroups(data || []);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interest Groups</h1>
          <p className="text-gray-600">Connect with students who share your interests</p>
        </motion.div>

        {/* Groups Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : groups.length > 0 ? (
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

