import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, EntityImage, SiteSetting } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import ImageManager from '@/components/admin/ImageManager';
import AdminLayout from '../components/layout/AdminLayout';
import { 
  Image, Upload, Building2, Calendar, Briefcase, Users, 
  Home, Search, Loader2, Save, RefreshCw, ExternalLink, 
  Palette, Star, Check, X
} from 'lucide-react';

export default function AdminMedia() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isAuthenticated, loading: authLoading, profileLoaded } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('landing');
  const [loading, setLoading] = useState(true);
  
  // Landing page settings
  const [heroImage, setHeroImage] = useState(null);
  const [heroImageInput, setHeroImageInput] = useState('');
  const [savingHero, setSavingHero] = useState(false);
  
  // Entity selection for image management
  const [entityType, setEntityType] = useState('place');
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEntities, setLoadingEntities] = useState(false);

  useEffect(() => {
    if (!authLoading && profileLoaded) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      if (!isAdmin()) {
        navigate(createPageUrl('Home'));
        return;
      }
      loadSiteSettings();
      
      // Check for entity pre-selection from URL
      const preselectedType = searchParams.get('type');
      const preselectedId = searchParams.get('id');
      if (preselectedType && preselectedId) {
        setEntityType(preselectedType);
        setActiveTab('listings');
        loadAndSelectEntity(preselectedType, preselectedId);
      }
    }
  }, [authLoading, profileLoaded]);

  useEffect(() => {
    if (activeTab === 'listings') {
      loadEntities();
    }
  }, [entityType, activeTab]);

  const loadSiteSettings = async () => {
    try {
      setLoading(true);
      const hero = await SiteSetting.getHeroImage();
      setHeroImage(hero);
      setHeroImageInput(hero?.url || '');
    } catch (error) {
      console.error('Error loading site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntities = async () => {
    setLoadingEntities(true);
    try {
      let data = [];
      switch (entityType) {
        case 'place':
          data = await Place.list({ limit: 100 });
          break;
        case 'event':
          data = await Event.list({ limit: 100 });
          break;
        case 'opportunity':
          data = await Opportunity.list({ limit: 100 });
          break;
        case 'interest_group':
          data = await InterestGroup.list({ limit: 100 });
          break;
      }
      setEntities(data || []);
    } catch (error) {
      console.error('Error loading entities:', error);
    } finally {
      setLoadingEntities(false);
    }
  };

  const loadAndSelectEntity = async (type, id) => {
    try {
      let entity = null;
      switch (type) {
        case 'place':
          entity = await Place.get(id);
          break;
        case 'event':
          entity = await Event.get(id);
          break;
        case 'opportunity':
          entity = await Opportunity.get(id);
          break;
        case 'interest_group':
          entity = await InterestGroup.get(id);
          break;
      }
      if (entity) {
        setSelectedEntity(entity);
      }
    } catch (error) {
      console.error('Error loading entity:', error);
    }
  };

  const handleSaveHeroImage = async () => {
    if (!heroImageInput.trim()) return;
    
    setSavingHero(true);
    try {
      await SiteSetting.setHeroImage(heroImageInput.trim(), 'Campus', 'admin');
      setHeroImage({ url: heroImageInput.trim(), alt: 'Campus', source: 'admin' });
      toast({
        title: 'Hero image updated',
        description: 'The landing page hero image has been changed'
      });
    } catch (error) {
      console.error('Error saving hero image:', error);
      toast({
        title: 'Failed to save',
        description: error.message || 'Could not update hero image',
        variant: 'destructive'
      });
    } finally {
      setSavingHero(false);
    }
  };

  const filteredEntities = entities.filter(e => {
    const name = (e.name || e.title || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const getEntityName = (entity) => entity.name || entity.title || 'Untitled';
  
  const getEntityIcon = (type) => {
    switch (type) {
      case 'place': return <Building2 className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'opportunity': return <Briefcase className="w-4 h-4" />;
      case 'interest_group': return <Users className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  const entityTypeLabels = {
    place: 'Places',
    event: 'Events',
    opportunity: 'Opportunities',
    interest_group: 'Interest Groups'
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout active="Media">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Media Management</h1>
        <p className="text-gray-600 mt-2">Manage images for listings and site settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="landing" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Landing Page
          </TabsTrigger>
          <TabsTrigger value="listings" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Listing Images
          </TabsTrigger>
        </TabsList>

        {/* Landing Page Settings */}
        <TabsContent value="landing">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Hero Image Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Hero Image
                </CardTitle>
                <CardDescription>
                  The main background image on the landing page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border">
                  {heroImageInput ? (
                    <img
                      src={heroImageInput}
                      alt="Hero preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Image className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-blue-900/70 flex items-center justify-center">
                    <div className="text-white text-center px-4">
                      <h2 className="text-lg font-bold">Discover Your Campus Life</h2>
                      <p className="text-sm opacity-80">Preview of hero section</p>
                    </div>
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <Label htmlFor="hero-url">Image URL</Label>
                  <Input
                    id="hero-url"
                    value={heroImageInput}
                    onChange={(e) => setHeroImageInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 1920x1080 or larger, high-quality campus/college imagery
                  </p>
                </div>

                {/* Quick Suggestions */}
                <div>
                  <Label className="text-sm text-gray-500">Quick suggestions (Unsplash)</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[
                      { label: 'Campus Quad', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920' },
                      { label: 'Library', url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920' },
                      { label: 'Students', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920' },
                      { label: 'Graduation', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1920' }
                    ].map((suggestion) => (
                      <Button
                        key={suggestion.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHeroImageInput(suggestion.url)}
                        className="text-xs"
                      >
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <Button 
                  onClick={handleSaveHeroImage} 
                  disabled={savingHero || !heroImageInput.trim() || heroImageInput === heroImage?.url}
                  className="w-full"
                >
                  {savingHero ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Hero Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Current Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Settings</CardTitle>
                <CardDescription>
                  Active landing page configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Hero Image</span>
                    <div className="flex items-center gap-2">
                      {heroImage?.url ? (
                        <>
                          <Badge variant="outline" className="text-green-600">
                            <Check className="w-3 h-3 mr-1" />
                            Set
                          </Badge>
                          <a 
                            href={heroImage.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </a>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          <X className="w-3 h-3 mr-1" />
                          Using default
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Image Source</span>
                    <Badge variant="secondary">
                      {heroImage?.source || 'unsplash'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Tips for Hero Images</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use high-resolution images (1920px+ width)</li>
                    <li>• Campus/college imagery works best</li>
                    <li>• Avoid images with text overlay</li>
                    <li>• Choose images that work with blue gradient overlay</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Listing Images */}
        <TabsContent value="listings">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Entity Selection Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Select Listing</CardTitle>
                  <CardDescription>
                    Choose a listing to manage its images
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Entity Type Selector */}
                  <Select value={entityType} onValueChange={(v) => {
                    setEntityType(v);
                    setSelectedEntity(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="place">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Places
                        </div>
                      </SelectItem>
                      <SelectItem value="event">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Events
                        </div>
                      </SelectItem>
                      <SelectItem value="opportunity">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Opportunities
                        </div>
                      </SelectItem>
                      <SelectItem value="interest_group">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Interest Groups
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${entityTypeLabels[entityType].toLowerCase()}...`}
                      className="pl-10"
                    />
                  </div>

                  {/* Entity List */}
                  <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                    {loadingEntities ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : filteredEntities.length > 0 ? (
                      <div className="divide-y">
                        {filteredEntities.map((entity) => (
                          <button
                            key={entity.id}
                            onClick={() => setSelectedEntity(entity)}
                            className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                              selectedEntity?.id === entity.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                            }`}
                          >
                            {/* Thumbnail */}
                            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                              {entity.image_url ? (
                                <img
                                  src={entity.image_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  {getEntityIcon(entityType)}
                                </div>
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {getEntityName(entity)}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {entity.category || entity.type || '—'}
                              </p>
                            </div>
                            {/* Status */}
                            <Badge 
                              variant={entity.status === 'approved' ? 'default' : 'secondary'}
                              className="text-xs flex-shrink-0"
                            >
                              {entity.status}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No {entityTypeLabels[entityType].toLowerCase()} found
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadEntities}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh List
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Image Management Panel */}
            <div className="lg:col-span-2">
              {selectedEntity ? (
                <div className="space-y-4">
                  {/* Selected Entity Header */}
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                          {selectedEntity.image_url ? (
                            <img
                              src={selectedEntity.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {getEntityIcon(entityType)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getEntityIcon(entityType)}
                            <Badge variant="outline" className="text-xs">
                              {entityTypeLabels[entityType].slice(0, -1)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg truncate mt-1">
                            {getEntityName(selectedEntity)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {selectedEntity.category || selectedEntity.type || selectedEntity.address || '—'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(createPageUrl('Detail') + `?type=${entityType}&id=${selectedEntity.id}`)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Image Manager */}
                  <ImageManager
                    entityType={entityType}
                    entityId={selectedEntity.id}
                    maxImages={10}
                    showPrimaryBadge={true}
                    allowUpload={true}
                    allowUrl={true}
                  />

                  {/* Legacy Image Info */}
                  {selectedEntity.image_url && (
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={selectedEntity.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Legacy Image URL</p>
                            <p className="text-xs text-gray-500 truncate">{selectedEntity.image_url}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Original
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          💡 This is the original image_url stored on the listing. 
                          Add it to the image gallery above to manage it alongside other images.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center">
                      <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-2">Select a Listing</h3>
                      <p className="text-gray-500 text-sm max-w-sm mx-auto">
                        Choose a {entityTypeLabels[entityType].toLowerCase().slice(0, -1)} from the list 
                        to view and manage its images.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
