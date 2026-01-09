import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Building2, Briefcase, Users, Upload, Loader2 } from 'lucide-react';
import PlacesAutocomplete from '@/components/maps/PlacesAutocomplete';

export default function AddListingDialog({ open, onClose, onSuccess }) {
  const { getCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('event');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    name: '',
    description: '',
    category: '',
    type: '',
    location: '',
    address: '',
    date: '',
    time: '',
    organization: '',
    deadline: '',
    latitude: null,
    longitude: null
  });

  const user = getCurrentUser();

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview immediately
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setUploading(true);
    try {
      const { url } = await UploadFile({ file, bucket: 'uploads' });
      setImageUrl(url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      // If upload fails, we keep the preview but the submission will lack the real URL
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const baseData = {
        description: formData.description,
        image_url: imageUrl,
        status: 'pending',
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      switch (activeTab) {
        case 'event':
          await Event.create({
            ...baseData,
            title: formData.title,
            category: formData.category,
            location: formData.location,
            date: formData.date,
            time: formData.time,
            created_by: user?.id
          });
          break;
        case 'place':
          await Place.create({
            ...baseData,
            name: formData.name,
            category: formData.category,
            address: formData.address,
            created_by: user?.id
          });
          break;
        case 'opportunity':
          await Opportunity.create({
            ...baseData,
            title: formData.title,
            type: formData.type,
            organization: formData.organization,
            location: formData.location,
            deadline: formData.deadline,
            created_by: user?.id
          });
          break;
        case 'group':
          await InterestGroup.create({
            ...baseData,
            name: formData.name,
            category: formData.category,
            created_by: user?.id,
            member_count: 1
          });
          break;
      }

      // Reset form
      setFormData({
        title: '', name: '', description: '', category: '', type: '',
        location: '', address: '', date: '', time: '', organization: '', deadline: '',
        latitude: null, longitude: null
      });
      setImageUrl('');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Listing</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="event" className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" /> Event
            </TabsTrigger>
            <TabsTrigger value="place" className="flex items-center gap-1 text-xs">
              <Building2 className="w-3 h-3" /> Place
            </TabsTrigger>
            <TabsTrigger value="opportunity" className="flex items-center gap-1 text-xs">
              <Briefcase className="w-3 h-3" /> Job
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" /> Group
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Image Upload */}
            <div>
              <Label>Image</Label>
              <div className="mt-2 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center relative">
                {previewUrl || imageUrl ? (
                  <img src={previewUrl || imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                ) : (
                  <div className="py-4">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click to upload image</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
              </div>
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>

            {/* Event Form */}
            <TabsContent value="event" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => updateField('title', e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Social">Social</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Shows">Shows</SelectItem>
                    <SelectItem value="Talks">Talks</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => updateField('date', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" value={formData.time} onChange={(e) => updateField('time', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <PlacesAutocomplete
                  value={formData.location}
                  onChange={(value) => updateField('location', value)}
                  onPlaceSelect={(place) => {
                    updateField('location', place.address || place.name);
                    updateField('latitude', place.latitude);
                    updateField('longitude', place.longitude);
                  }}
                  placeholder="Search for a venue..."
                />
              </div>
            </TabsContent>

            {/* Place Form */}
            <TabsContent value="place" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="name">Place Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => updateField('name', e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Restaurants">Restaurant</SelectItem>
                    <SelectItem value="Cafes">Cafe</SelectItem>
                    <SelectItem value="Bars">Bar</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Study Spots">Study Spot</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <PlacesAutocomplete
                  value={formData.address}
                  onChange={(value) => updateField('address', value)}
                  onPlaceSelect={(place) => {
                    updateField('address', place.address || place.name);
                    updateField('latitude', place.latitude);
                    updateField('longitude', place.longitude);
                  }}
                  placeholder="Search for address..."
                />
              </div>
            </TabsContent>

            {/* Opportunity Form */}
            <TabsContent value="opportunity" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="title">Position Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => updateField('title', e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Work">Job</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Volunteer">Volunteer</SelectItem>
                    <SelectItem value="Research">Research</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" value={formData.organization} onChange={(e) => updateField('organization', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input id="deadline" type="date" value={formData.deadline} onChange={(e) => updateField('deadline', e.target.value)} />
              </div>
            </TabsContent>

            {/* Group Form */}
            <TabsContent value="group" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => updateField('name', e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={formData.category} onChange={(e) => updateField('category', e.target.value)} placeholder="e.g., Sports, Music, Tech" />
              </div>
            </TabsContent>

            {/* Description (common) */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => updateField('description', e.target.value)} rows={3} />
            </div>

            <Button type="submit" className="w-full" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Submit for Review'
              )}
            </Button>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

