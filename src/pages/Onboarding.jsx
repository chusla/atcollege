import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Campus } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { Search, GraduationCap, Loader2, Upload, User } from 'lucide-react';

const interestOptions = [
  'Sports', 'Music', 'Arts', 'Technology', 'Food', 'Gaming',
  'Fitness', 'Reading', 'Travel', 'Photography', 'Volunteering'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile, isAuthenticated, loading: authLoading } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const [filteredCampuses, setFilteredCampuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form data
  const [avatarUrl, setAvatarUrl] = useState('');
  const [firstName, setFirstName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [gender, setGender] = useState('');
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
        campus.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCampuses(filtered);
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await UploadFile({ file, bucket: 'avatars' });
      setAvatarUrl(url);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleInterestToggle = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSelectCampus = (campus) => {
    setSelectedCampusId(campus.id);
    setSelectedCampusName(campus.name);
  };

  const handleComplete = async () => {
    if (!firstName.trim()) {
      alert('Please enter your first name');
      return;
    }
    if (!gender) {
      alert('Please select your gender');
      return;
    }
    if (!selectedCampusId) {
      alert('Please select your university');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        avatar_url: avatarUrl,
        first_name: firstName,
        interests: selectedInterests,
        gender: gender,
        selected_campus_id: selectedCampusId,
        selected_campus_name: selectedCampusName,
        registration_complete: true
      });
      navigate(createPageUrl('Home'));
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
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
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete your registration</h1>
          <p className="text-gray-600">
            Tell us about yourself and select your university
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 space-y-6"
        >
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors"
              >
                <Upload className="w-4 h-4 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
            {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* Interest Groups */}
          <div className="space-y-3">
            <Label>Interests (optional)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {interestOptions.map((interest) => (
                <div
                  key={interest}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={interest}
                    checked={selectedInterests.includes(interest)}
                    onCheckedChange={() => handleInterestToggle(interest)}
                  />
                  <label
                    htmlFor={interest}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {interest}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other / Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Your University</h3>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search universities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Campus Display */}
            {selectedCampusId && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-gray-900">{selectedCampusName}</span>
              </div>
            )}

            {/* Campus List */}
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2">
                {filteredCampuses.map((campus) => (
                  <button
                    key={campus.id}
                    onClick={() => handleSelectCampus(campus)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedCampusId === campus.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    {campus.image_url ? (
                      <img
                        src={campus.image_url}
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
                      <p className="text-xs text-gray-500">{campus.location}</p>
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
          </div>

          {/* Complete Button */}
          <Button
            onClick={handleComplete}
            disabled={saving || !firstName || !gender || !selectedCampusId}
            className="w-full bg-orange-500 hover:bg-orange-600 py-6 text-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Registration'
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

