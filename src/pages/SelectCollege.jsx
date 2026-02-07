import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Campus } from '@/api/entities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Search, GraduationCap, Loader2 } from 'lucide-react';

export default function SelectCollege() {
  const navigate = useNavigate();
  const { updateProfile, isAuthenticated, loading: authLoading } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const [filteredCampuses, setFilteredCampuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedCampusName, setSelectedCampusName] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      navigate(createPageUrl('Landing'));
      return;
    }
    loadCampuses();
  }, [authLoading]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = campuses.filter(campus =>
        campus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campus.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCampuses(filtered);
      // Auto-select if exactly one match
      if (filtered.length === 1) {
        setSelectedCampusId(filtered[0].id);
        setSelectedCampusName(filtered[0].name);
      }
    } else {
      setFilteredCampuses(campuses);
    }
  }, [searchQuery, campuses]);

  const loadCampuses = async () => {
    try {
      const data = await Campus.list({ orderBy: { column: 'name', ascending: true }, limit: 100 });
      setCampuses(data || []);
      setFilteredCampuses(data || []);
    } catch (error) {
      console.error('Error loading campuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCampus = (campus) => {
    setSelectedCampusId(campus.id);
    setSelectedCampusName(campus.name);
  };

  const handleContinue = async () => {
    if (!selectedCampusId) {
      alert('Please select a university');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        selected_campus_id: selectedCampusId,
        selected_campus_name: selectedCampusName
      });
      navigate(createPageUrl('Home'));
    } catch (error) {
      console.error('Error saving campus:', error);
      alert('Failed to save selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Your University</h1>
          <p className="text-gray-600">
            Choose your campus to see relevant events and opportunities
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-8 shadow-sm border border-gray-200"
        >
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Type to filter, then click to select..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Helper text */}
          <p className="text-sm text-gray-500 mb-4">
            Click on a university from the list below to select it
          </p>

          {/* Selected Campus Display */}
          {selectedCampusId && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">{selectedCampusName}</span>
            </div>
          )}

          {/* Campus List */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg p-2">
              {filteredCampuses.map((campus) => (
                <button
                  key={campus.id}
                  onClick={() => handleSelectCampus(campus)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedCampusId === campus.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  {campus.logo_url ? (
                    <img
                      src={campus.logo_url}
                      alt={campus.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-900">{campus.name}</h3>
                    <p className="text-xs text-gray-500">{campus.city}, {campus.state}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredCampuses.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No universities found</p>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={saving || !selectedCampusId}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 py-6 text-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

