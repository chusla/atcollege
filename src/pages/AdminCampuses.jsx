import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Campus } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Plus, Pencil, Trash2, MapPin, Search, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '../components/layout/AdminLayout';
import UniversitySearch from '../components/admin/UniversitySearch';
import { fetchUniversityBranding, getWikipediaImageUrl } from '@/utils/wikipediaScraper';
import { getContrastTextColor } from '@/lib/utils';

export default function AdminCampuses() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    image_url: '',
    google_place_id: '',
    primary_color: '',
    secondary_color: '',
    logo_url: ''
  });
  const [showSearch, setShowSearch] = useState(true);
  const [fetchingBranding, setFetchingBranding] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(null); // { current, total, name }

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      if (!isAdmin()) {
        navigate(createPageUrl('Home'));
        return;
      }
      loadCampuses();
    }
  }, [authLoading]);

  const loadCampuses = async () => {
    try {
      const data = await Campus.list({ orderBy: { column: 'name', ascending: true } });
      setCampuses(data || []);
    } catch (error) {
      console.error('Error loading campuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        location: formData.location,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        image_url: formData.image_url || null,
        google_place_id: formData.google_place_id || null,
        primary_color: formData.primary_color || null,
        secondary_color: formData.secondary_color || null,
        logo_url: formData.logo_url || null
      };
      
      if (editingCampus) {
        await Campus.update(editingCampus.id, submitData);
        toast({
          title: "Campus updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        await Campus.create(submitData);
        toast({
          title: "Campus added",
          description: `${formData.name} has been added to the list.`,
        });
      }
      setDialogOpen(false);
      setEditingCampus(null);
      setFormData({ 
        name: '', 
        location: '', 
        latitude: '', 
        longitude: '', 
        image_url: '',
        google_place_id: '',
        primary_color: '',
        secondary_color: '',
        logo_url: ''
      });
      loadCampuses();
    } catch (error) {
      console.error('Error saving campus:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save campus",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (campus) => {
    setEditingCampus(campus);
    setFormData({
      name: campus.name || '',
      location: campus.location || '',
      latitude: campus.latitude?.toString() || '',
      longitude: campus.longitude?.toString() || '',
      image_url: campus.image_url || '',
      google_place_id: campus.google_place_id || '',
      primary_color: campus.primary_color || '',
      secondary_color: campus.secondary_color || '',
      logo_url: campus.logo_url || ''
    });
    setShowSearch(false); // Skip search when editing
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campus? This may affect users who have selected it.')) return;
    try {
      await Campus.delete(id);
      toast({
        title: "Campus deleted",
        description: "The campus has been removed.",
      });
      loadCampuses();
    } catch (error) {
      console.error('Error deleting campus:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete campus",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = () => {
    setEditingCampus(null);
    setFormData({ 
      name: '', 
      location: '', 
      latitude: '', 
      longitude: '', 
      image_url: '',
      google_place_id: '',
      primary_color: '',
      secondary_color: '',
      logo_url: ''
    });
    setShowSearch(true);
    setDialogOpen(true);
  };

  // Backfill branding for all campuses missing colors/logo
  const handleBackfillBranding = async () => {
    const campusesNeedingBranding = campuses.filter(c => !c.primary_color || !c.logo_url);
    
    if (campusesNeedingBranding.length === 0) {
      toast({
        title: "All set!",
        description: "All campuses already have branding data.",
      });
      return;
    }

    const confirmed = window.confirm(
      `This will fetch branding from Wikipedia for ${campusesNeedingBranding.length} campus(es). Continue?`
    );
    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < campusesNeedingBranding.length; i++) {
      const campus = campusesNeedingBranding[i];
      setBackfillProgress({ current: i + 1, total: campusesNeedingBranding.length, name: campus.name });

      try {
        console.log(`🎓 Backfilling branding for: ${campus.name}`);
        const branding = await fetchUniversityBranding(campus.name);
        
        if (branding.primaryColor || branding.logoUrl) {
          await Campus.update(campus.id, {
            primary_color: branding.primaryColor || campus.primary_color,
            secondary_color: branding.secondaryColor || campus.secondary_color,
            logo_url: branding.logoUrl ? getWikipediaImageUrl(branding.logoUrl, 200) : campus.logo_url
          });
          successCount++;
          console.log(`✅ Updated ${campus.name}:`, branding);
        } else {
          console.log(`⚠️ No branding found for ${campus.name}`);
          failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Error backfilling ${campus.name}:`, error);
        failCount++;
      }
    }

    setBackfillProgress(null);
    loadCampuses(); // Reload the list

    toast({
      title: "Backfill complete!",
      description: `Updated ${successCount} campus(es). ${failCount > 0 ? `${failCount} failed.` : ''}`,
      variant: failCount > 0 ? "default" : "default"
    });
  };

  const handleUniversitySelect = async (university) => {
    // Extract city/state from address
    const addressParts = university.address?.split(',') || [];
    const location = addressParts.length >= 2 
      ? `${addressParts[addressParts.length - 3]?.trim() || ''}, ${addressParts[addressParts.length - 2]?.trim() || ''}`.replace(/^,\s*/, '')
      : university.address || '';
    
    // Set basic data immediately
    setFormData({
      ...formData,
      name: university.name,
      location: location,
      latitude: university.latitude?.toString() || '',
      longitude: university.longitude?.toString() || '',
      image_url: university.photo_url || '',
      google_place_id: university.google_place_id || '',
      primary_color: '',
      secondary_color: '',
      logo_url: ''
    });
    setShowSearch(false);
    
    // Fetch branding from Wikipedia in background
    setFetchingBranding(true);
    try {
      const branding = await fetchUniversityBranding(university.name);
      
      // Update form with Wikipedia data
      setFormData(prev => ({
        ...prev,
        primary_color: branding.primaryColor || prev.primary_color,
        secondary_color: branding.secondaryColor || prev.secondary_color,
        logo_url: branding.logoUrl ? getWikipediaImageUrl(branding.logoUrl, 200) : prev.logo_url
      }));
      
      if (branding.primaryColor || branding.logoUrl) {
        toast({
          title: "Branding found!",
          description: `School colors${branding.logoUrl ? ' and logo' : ''} auto-populated from Wikipedia`,
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setFetchingBranding(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout active="Campuses">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campus Management</h1>
          <p className="text-gray-600 mt-2">Add and manage universities ({campuses.length} total)</p>
          {backfillProgress && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                Fetching branding ({backfillProgress.current}/{backfillProgress.total}): {backfillProgress.name}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleBackfillBranding}
            disabled={backfillProgress !== null}
          >
            {backfillProgress ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Backfilling...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Backfill Branding
              </>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Campus
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCampus ? 'Edit Campus' : 'Add New Campus'}</DialogTitle>
            </DialogHeader>
            
            {/* Step 1: University Search (only for new campuses) */}
            {!editingCampus && showSearch && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Search for University</Label>
                  <p className="text-xs text-gray-500 mb-2">Start typing to find your university</p>
                  <UniversitySearch 
                    onSelect={handleUniversitySelect}
                    placeholder="e.g., Tufts University, Harvard..."
                  />
                </div>
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">— or —</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowSearch(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Enter details manually
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Form (after selection or manual entry) */}
            {(!showSearch || editingCampus) && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Back to search button */}
                {!editingCampus && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowSearch(true)}
                    className="text-gray-500 hover:text-gray-700 -ml-2"
                  >
                    <Search className="w-4 h-4 mr-1" />
                    Search for a different university
                  </Button>
                )}

                {/* Preview card if we have data */}
                {formData.name && (() => {
                  // Calculate contrasting colors based on luminance
                  const bgColor = formData.primary_color || '#dbeafe';
                  const iconColor = getContrastTextColor(bgColor);
                  
                  return (
                  <div 
                    className="border rounded-lg p-4 flex items-center gap-4"
                    style={{
                      backgroundColor: formData.primary_color ? `${formData.primary_color}15` : '#eff6ff',
                      borderColor: formData.primary_color ? `${formData.primary_color}40` : '#dbeafe'
                    }}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200"
                      style={{
                        backgroundColor: formData.logo_url ? '#FFFFFF' : bgColor
                      }}
                    >
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
                      ) : fetchingBranding ? (
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: iconColor }} />
                      ) : (
                        <GraduationCap className="w-6 h-6" style={{ color: iconColor }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{formData.name}</p>
                      {formData.location && (
                        <p className="text-sm text-gray-600">{formData.location}</p>
                      )}
                      {fetchingBranding && (
                        <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                          <Sparkles className="w-3 h-3" />
                          Fetching colors & logo from Wikipedia...
                        </p>
                      )}
                    </div>
                    {formData.primary_color && (
                      <div className="flex gap-1">
                        <div 
                          className="w-6 h-6 rounded border border-white/50" 
                          style={{ backgroundColor: formData.primary_color }}
                          title={formData.primary_color}
                        />
                        {formData.secondary_color && (
                          <div 
                            className="w-6 h-6 rounded border border-gray-200" 
                            style={{ backgroundColor: formData.secondary_color }}
                            title={formData.secondary_color}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )})()}

                <div>
                  <Label htmlFor="name">Campus Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Dartmouth College"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location (City, State)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Hanover, NH"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude *</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g., 43.7044"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude *</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g., -72.2887"
                      required
                    />
                  </div>
                </div>
                
                {/* Branding Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">School Branding (Optional)</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={fetchingBranding || !formData.name}
                      onClick={async () => {
                        if (!formData.name) return;
                        setFetchingBranding(true);
                        try {
                          const branding = await fetchUniversityBranding(formData.name);
                          setFormData(prev => ({
                            ...prev,
                            primary_color: branding.primaryColor || prev.primary_color,
                            secondary_color: branding.secondaryColor || prev.secondary_color,
                            logo_url: branding.logoUrl ? getWikipediaImageUrl(branding.logoUrl, 200) : prev.logo_url
                          }));
                          toast({
                            title: branding.primaryColor || branding.logoUrl ? "Branding updated!" : "No branding found",
                            description: branding.primaryColor || branding.logoUrl 
                              ? "Colors and logo fetched from Wikipedia" 
                              : "Could not find branding on Wikipedia. Enter manually.",
                            variant: branding.primaryColor || branding.logoUrl ? "default" : "destructive"
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to fetch from Wikipedia",
                            variant: "destructive"
                          });
                        } finally {
                          setFetchingBranding(false);
                        }
                      }}
                      className="text-xs"
                    >
                      {fetchingBranding ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          Fetch from Wikipedia
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="primary_color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary_color"
                          type="text"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          placeholder="#00693E"
                          className="flex-1"
                        />
                        <input
                          type="color"
                          value={formData.primary_color || '#00693E'}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="secondary_color">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary_color"
                          type="text"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          placeholder="#FFFFFF"
                          className="flex-1"
                        />
                        <input
                          type="color"
                          value={formData.secondary_color || '#FFFFFF'}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="logo_url"
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      {formData.logo_url && (
                        <div className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center overflow-hidden bg-white flex-shrink-0">
                          <img 
                            src={formData.logo_url} 
                            alt="Logo preview" 
                            className="w-8 h-8 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Auto-fetched from Wikipedia, or search "[School Name] logo png"
                    </p>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="image_url">Campus Image URL</Label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingCampus ? 'Update Campus' : 'Add Campus'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campus</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Branding</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No campuses yet. Click "Add Campus" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                campuses.map((campus) => {
                  // Calculate contrasting colors based on luminance
                  const bgColor = campus.primary_color || '#dbeafe';
                  const iconColor = getContrastTextColor(bgColor);
                  
                  return (
                  <TableRow key={campus.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200"
                          style={{ 
                            backgroundColor: campus.logo_url ? '#FFFFFF' : bgColor,
                          }}
                        >
                          {campus.logo_url ? (
                            <img 
                              src={campus.logo_url} 
                              alt={campus.name} 
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <GraduationCap 
                              className="w-5 h-5" 
                              style={{ color: iconColor }}
                            />
                          )}
                        </div>
                        <span className="font-medium">{campus.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{campus.location || '—'}</TableCell>
                    <TableCell>
                      {campus.primary_color ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border border-gray-200" 
                            style={{ backgroundColor: campus.primary_color }}
                            title={campus.primary_color}
                          />
                          {campus.secondary_color && (
                            <div 
                              className="w-6 h-6 rounded border border-gray-200" 
                              style={{ backgroundColor: campus.secondary_color }}
                              title={campus.secondary_color}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {campus.latitude && campus.longitude ? (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span>{campus.latitude.toFixed(4)}, {campus.longitude.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-orange-500 text-sm">⚠️ Missing</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(campus)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(campus.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
