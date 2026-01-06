import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { SavedItem, Comment, Campus } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UploadFile } from '@/api/integrations';
import { Mail, Heart, MessageSquare, GraduationCap, LogOut, Upload, Loader2 } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function Profile() {
  const navigate = useNavigate();
  const { getCurrentUser, updateProfile, signOut, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [likedItems, setLikedItems] = useState([]);
  const [comments, setComments] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [firstName, setFirstName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const user = getCurrentUser();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      setSelectedCampus(user?.selected_campus_id || '');
      setFirstName(user?.first_name || '');
      setAvatarUrl(user?.avatar_url || '');
      loadUserData();
    }
  }, [authLoading]);

  const loadUserData = async () => {
    try {
      const [saved, userComments, campusesList] = await Promise.all([
        SavedItem.filter({ user_id: user?.id }),
        Comment.filter({ user_id: user?.id }),
        Campus.list()
      ]);
      
      setLikedItems(saved || []);
      setComments(userComments || []);
      setCampuses(campusesList || []);
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
                <p className="text-2xl font-bold text-blue-600">{likedItems.length}</p>
                <p className="text-sm text-gray-600">Saved Items</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{comments.length}</p>
                <p className="text-sm text-gray-600">Comments</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">0</p>
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
                <p className="text-center text-gray-500 py-8">
                  {likedItems.length === 0 ? 'No saved items yet' : `${likedItems.length} saved items`}
                </p>
              </TabsContent>

              <TabsContent value="commented">
                <p className="text-center text-gray-500 py-8">
                  {comments.length === 0 ? 'No comments yet' : `${comments.length} comments`}
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* College Settings Card */}
        <Card>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

