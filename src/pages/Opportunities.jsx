import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Opportunity, SavedItem } from '@/api/entities';
import OpportunityCard from '../components/cards/OpportunityCard';
import OpportunityRowCard from '../components/results/OpportunityRowCard';
import ViewToggle from '../components/results/ViewToggle';
import ResultsMapView from '../components/results/ResultsMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { MapPin, Filter, Briefcase, Calendar } from 'lucide-react';

export default function Opportunities() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [view, setView] = useState('grid');

  const urlParams = new URLSearchParams(window.location.search);
  const [type, setType] = useState(urlParams.get('type') || 'all');
  const [timeWindow, setTimeWindow] = useState(urlParams.get('timeWindow') || '1month');
  const [radius, setRadius] = useState(urlParams.get('radius') || '5');

  useEffect(() => {
    loadOpportunities();
    loadSavedItems();
  }, [type]);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const filters = { status: 'approved' };
      if (type && type !== 'all') {
        filters.type = type.toLowerCase();
      }
      const data = await Opportunity.filter(filters, { 
        orderBy: { column: 'created_at', ascending: false }, 
        limit: 20 
      });
      setOpportunities(data || []);
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
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-40">
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

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={timeWindow} onValueChange={setTimeWindow}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
            </div>
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </motion.div>

        {/* Map View */}
        {view === 'map' && !loading && opportunities.length > 0 && (
          <ResultsMapView items={opportunities} itemType="opportunity" />
        )}

        {/* Opportunities Grid */}
        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-4'}>
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className={view === 'grid' ? 'aspect-[4/5] rounded-2xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : opportunities.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

