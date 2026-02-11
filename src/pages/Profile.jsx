import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { SavedItem, Comment, Campus, Event, Place, Opportunity, InterestGroup } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UploadFile } from '@/api/integrations';
import { Mail, Heart, MessageSquare, GraduationCap, LogOut, Upload, Loader2, Calendar, Building2, Briefcase, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import UniversitySearch from '../components/admin/UniversitySearch';
import { fetchUniversityBranding, getWikipediaImageUrl } from '@/utils/wikipediaScraper';
import DashboardLayout from '../components/layout/DashboardLayout';
import { format } from 'date-fns';

export default function Profile() {
  const navigate = useNavigate();
  const { getCurrentUser, updateProfile, signOut, isAuthenticated, loading: authLoading, profileLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [combinedSavedItems, setCombinedSavedItems] = useState([]);
  const [comments, setComments] = useState([]);

  // Pagination
  const [savedItemsPage, setSavedItemsPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [firstName, setFirstName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Add university
  const [showAddUniversity, setShowAddUniversity] = useState(false);
  const [addingUniversity, setAddingUniversity] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      // Sync local state with user profile when it becomes available or changes
      if (user) {
        setSelectedCampus(user.selected_campus_id || '');
        setFirstName(user.first_name || '');
        setAvatarUrl(user.avatar_url || '');
      }

      // Load other data independent of profile fields (but dependent on user id)
      loadUserData();
    } else if (!authLoading && !isAuthenticated()) {
      navigate(createPageUrl('Landing'));
    }
  }, [authLoading, user?.id, user?.first_name, user?.avatar_url, user?.selected_campus_id]);

  const loadUserData = async () => {
    try {
      const [saved, userComments, campusesList] = await Promise.all([
        SavedItem.filter({ user_id: user?.id }),
        Comment.filter({ user_id: user?.id }),
        Campus.list()
      ]);

      setSavedItems(saved || []);
      setComments(userComments || []);
      setCampuses(campusesList || []);

      // Fetch full data for saved items by type
      if (saved && saved.length > 0) {
        const eventIds = saved.filter(s => s.item_type === 'event').map(s => s.item_id);
        const placeIds = saved.filter(s => s.item_type === 'place').map(s => s.item_id);
        const oppIds = saved.filter(s => s.item_type === 'opportunity').map(s => s.item_id);
        const groupIds = saved.filter(s => s.item_type === 'group').map(s => s.item_id);

        const [allEvents, allPlaces, allOpps, allGroups] = await Promise.all([
          eventIds.length > 0 ? Event.list() : Promise.resolve([]),
          placeIds.length > 0 ? Place.list() : Promise.resolve([]),
          oppIds.length > 0 ? Opportunity.list() : Promise.resolve([]),
          groupIds.length > 0 ? InterestGroup.list() : Promise.resolve([])
        ]);

        const events = (allEvents || []).filter(e => eventIds.includes(e.id)).map(e => ({ ...e, _type: 'event' }));
        const places = (allPlaces || []).filter(p => placeIds.includes(p.id)).map(p => ({ ...p, _type: 'place' }));
        const opps = (allOpps || []).filter(o => oppIds.includes(o.id)).map(o => ({ ...o, _type: 'opportunity' }));
        const groups = (allGroups || []).filter(g => groupIds.includes(g.id)).map(g => ({ ...g, _type: 'group' }));

        // Map saved items in order to preserve sort order of saving
        const combined = saved.map(s => {
          if (s.item_type === 'event') return events.find(e => e.id === s.item_id);
          if (s.item_type === 'place') return places.find(p => p.id === s.item_id);
          if (s.item_type === 'opportunity') return opps.find(o => o.id === s.item_id);
          if (s.item_type === 'group') return groups.find(g => g.id === s.item_id);
          return null;
        }).filter(Boolean);

        setCombinedSavedItems(combined);
      } else {
        setCombinedSavedItems([]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampus = async () => {
    try {
      const campus = campuses.find(c => c.id === selectedCampus);
      await updateProfile({
        selected_campus_id: selectedCampus,
        selected_campus_name: campus?.name || ''
      });
      alert('College updated successfully!');
    } catch (error) {
      console.error('Error updating campus:', error);
    }
  };

  const handleUniversitySelect = async (university) => {
    setAddingUniversity(true);
    try {
      // Extract location from address
      const addressParts = university.address?.split(',') || [];
      const location = addressParts.length >= 2
        ? `${addressParts[addressParts.length - 3]?.trim() || ''}, ${addressParts[addressParts.length - 2]?.trim() || ''}`.replace(/^,\s*/, '')
        : university.address || '';

      // Create campus with full data from Google Places
      const campusData = {
        name: university.name,
        location: location,
        latitude: university.latitude || null,
        longitude: university.longitude || null,
        image_url: university.photo_url || '',
        google_place_id: university.google_place_id || '',
      };

      // Fetch branding from Wikipedia
      try {
        const branding = await fetchUniversityBranding(university.name);
        if (branding.primaryColor) campusData.primary_color = branding.primaryColor;
        if (branding.secondaryColor) campusData.secondary_color = branding.secondaryColor;
        if (branding.logoUrl) campusData.logo_url = getWikipediaImageUrl(branding.logoUrl, 200);
      } catch (e) {
        console.error('Error fetching branding:', e);
      }

      const newCampus = await Campus.create(campusData);

      if (newCampus?.id) {
        await InterestGroup.seedDefaultGroups(newCampus.id);

        setSelectedCampus(newCampus.id);
        setCampuses(prev => [...prev, newCampus]);
        setShowAddUniversity(false);

        await updateProfile({
          selected_campus_id: newCampus.id,
          selected_campus_name: newCampus.name
        });
        alert('University added and selected!');
      }
    } catch (error) {
      console.error('Error adding university:', error);
      alert('Failed to add university. Please try again.');
    } finally {
      setAddingUniversity(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await UploadFile({ file, bucket: 'avatars' });
      setAvatarUrl(url);
      await updateProfile({ avatar_url: url });
      alert('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!firstName.trim()) {
      alert('Please enter your name');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ first_name: firstName });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate(createPageUrl('Landing'));
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const initials = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : 'U';

  // Pagination Calculations
  const totalSavedPages = Math.ceil(combinedSavedItems.length / ITEMS_PER_PAGE);
  const paginatedSavedItems = combinedSavedItems.slice(
    (savedItemsPage - 1) * ITEMS_PER_PAGE,
    savedItemsPage * ITEMS_PER_PAGE
  );

  const totalCommentsPages = Math.ceil(comments.length / ITEMS_PER_PAGE);
  const paginatedComments = comments.slice(
    (commentsPage - 1) * ITEMS_PER_PAGE,
    commentsPage * ITEMS_PER_PAGE
  );

  const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const renderSavedItem = (item) => {
    switch (item._type) {
      case 'event':
        return (
          <Link
            key={`event-${item.id}`}
            to={`${createPageUrl('Detail')}?type=event&id=${item.id}`}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200'}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{item.date ? format(new Date(item.date), 'MMM d, yyyy') : 'No date'}</span>
              </div>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Event</span>
          </Link>
        );
      case 'place':
        return (
          <Link
            key={`place-${item.id}`}
            to={`${createPageUrl('Detail')}?type=place&id=${item.id}`}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{item.address || item.category || 'Place'}</span>
              </div>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Place</span>
          </Link>
        );
      case 'opportunity':
        return (
          <Link
            key={`opp-${item.id}`}
            to={`${createPageUrl('Detail')}?type=opportunity&id=${item.id}`}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-orange-100 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{item.organization || item.type || 'Opportunity'}</span>
              </div>
            </div>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Opportunity</span>
          </Link>
        );
      case 'group':
        return (
          <Link
            key={`group-${item.id}`}
            to={`${createPageUrl('Detail')}?type=group&id=${item.id}`}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-3 h-3" />
                <span>{item.member_count || 0} members</span>
              </div>
            </div>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Group</span>
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout active="Profile" user={user}>
      <div className="max-w-4xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
            <p className="text-gray-600">Manage your account and preferences</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Profile Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl || user?.avatar_url} />
                  <AvatarFallback className="text-xl bg-orange-100 text-orange-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3 text-white" />
                  )}
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
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your name"
                    className="max-w-xs"
                  />
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    size="sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
                {user?.selected_campus_name && (
                  <div className="flex items-center gap-2 text-gray-500 mt-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>{user.selected_campus_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{savedItems.length}</p>
                <p className="text-sm text-gray-600">Saved Items</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{comments.length}</p>
                <p className="text-sm text-gray-600">Comments</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{combinedSavedItems.filter(i => i._type === 'group').length}</p>
                <p className="text-sm text-gray-600">Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Tabs */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Tabs defaultValue="liked">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="liked" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Saved Listings
                </TabsTrigger>
                <TabsTrigger value="commented" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="liked">
                {combinedSavedItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No saved items yet</p>
                ) : (
                  <div className="space-y-3">
                    {paginatedSavedItems.map(item => renderSavedItem(item))}

                    <PaginationControls
                      currentPage={savedItemsPage}
                      totalPages={totalSavedPages}
                      onPageChange={setSavedItemsPage}
                    />
                  </div>
                )}
              </TabsContent>


              <TabsContent value="commented">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No comments yet</p>
                ) : (
                  <div className="space-y-3">
                    {paginatedComments.map((comment) => (
                      <Link
                        key={comment.id}
                        to={`${createPageUrl('Detail')}?type=${comment.item_type}&id=${comment.item_id}`}
                        className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-gray-700 line-clamp-2">{comment.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span className="capitalize">{comment.item_type}</span>
                              <span>•</span>
                              <span>{comment.created_at ? format(new Date(comment.created_at), 'MMM d, yyyy') : ''}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}

                    <PaginationControls
                      currentPage={commentsPage}
                      totalPages={totalCommentsPages}
                      onPageChange={setCommentsPage}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs >
          </CardContent >
        </Card >

        {/* College Settings Card */}
        < Card >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              College Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Your College
              </Label>
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpdateCampus}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update College
            </Button>

            {/* Add University Section */}
            {!showAddUniversity ? (
              <button
                onClick={() => setShowAddUniversity(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Can't find your college? Add it here
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-900 text-sm">Add Your University</h4>
                <p className="text-xs text-gray-500">Start typing to search for your university</p>
                <UniversitySearch
                  onSelect={handleUniversitySelect}
                  placeholder="e.g., Stanford University, Harvard..."
                />
                {addingUniversity && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding university and fetching branding...
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowAddUniversity(false)}
                  className="text-sm"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card >
      </div >
    </DashboardLayout >
  );
}

