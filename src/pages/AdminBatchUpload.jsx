import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, Campus } from '@/api/entities';
import { geocodeAddress } from '@/api/googlePlaces';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertCircle, MapPin, Loader2, Sparkles } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import { fetchUniversityBranding, getWikipediaImageUrl } from '@/utils/wikipediaScraper';

export default function AdminBatchUpload() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading, profileLoaded, getCurrentUser } = useAuth();
  const [entityType, setEntityType] = useState('events');
  const [jsonData, setJsonData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

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
    }
  }, [authLoading, profileLoaded]);

  const [uploadProgress, setUploadProgress] = useState(null); // { current, total, name, step }

  /**
   * Process a campus item - geocode address if lat/long not provided,
   * fetch branding (logo, colors) from Wikipedia, and build location string
   */
  const processCampusItem = async (item) => {
    const processedItem = { ...item };
    
    // Build location from city + state if not provided
    if (!processedItem.location && (processedItem.city || processedItem.state)) {
      const parts = [];
      if (processedItem.city) parts.push(processedItem.city);
      if (processedItem.state) parts.push(processedItem.state);
      processedItem.location = parts.join(', ');
    }
    
    // If latitude/longitude not provided, geocode the address
    if (!processedItem.latitude || !processedItem.longitude) {
      const searchParts = [];
      if (processedItem.name) searchParts.push(processedItem.name);
      if (processedItem.city) searchParts.push(processedItem.city);
      if (processedItem.state) searchParts.push(processedItem.state);
      
      const searchAddress = searchParts.length > 0 
        ? searchParts.join(', ') 
        : processedItem.location;
      
      if (searchAddress) {
        console.log('📍 Geocoding campus:', searchAddress);
        const geocoded = await geocodeAddress(searchAddress);
        
        if (geocoded && geocoded.lat && geocoded.lng) {
          processedItem.latitude = geocoded.lat;
          processedItem.longitude = geocoded.lng;
          console.log('📍 Geocoded result:', geocoded);
        } else {
          console.warn('📍 Could not geocode address:', searchAddress);
        }
      }
    }

    // Fetch branding (logo, colors) from Wikipedia if not already provided
    if (processedItem.name && (!processedItem.primary_color || !processedItem.logo_url)) {
      try {
        console.log('🎨 Fetching branding for:', processedItem.name);
        const branding = await fetchUniversityBranding(processedItem.name);
        
        if (!processedItem.primary_color && branding.primaryColor) {
          processedItem.primary_color = branding.primaryColor;
        }
        if (!processedItem.secondary_color && branding.secondaryColor) {
          processedItem.secondary_color = branding.secondaryColor;
        }
        if (!processedItem.logo_url && branding.logoUrl) {
          processedItem.logo_url = getWikipediaImageUrl(branding.logoUrl, 200);
        }
        
        if (branding.primaryColor || branding.logoUrl) {
          console.log('🎨 Branding found for', processedItem.name, ':', {
            color: branding.primaryColor,
            logo: branding.logoUrl ? 'yes' : 'no'
          });
        }
      } catch (error) {
        console.warn('🎨 Could not fetch branding for:', processedItem.name, error);
      }
    }
    
    // Clean up temp fields that aren't in the campus table
    delete processedItem.city;
    delete processedItem.state;
    
    return processedItem;
  };

  const handleUpload = async () => {
    setUploading(true);
    setResult(null);

    try {
      const data = JSON.parse(jsonData);
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array of objects');
      }

      const entity = {
        events: Event,
        places: Place,
        opportunities: Opportunity,
        groups: InterestGroup,
        campuses: Campus
      }[entityType];

      let successCount = 0;
      let errorCount = 0;
      let errorMessages = [];
      let geocodedCount = 0;
      let brandedCount = 0;

      // Auto-inject campus_id and created_by from logged-in admin
      const currentUser = getCurrentUser();
      const autoFields = {};
      if (entityType !== 'campuses') {
        if (currentUser?.selected_campus_id) {
          autoFields.campus_id = currentUser.selected_campus_id;
        }
        if (currentUser?.id) {
          autoFields.created_by = currentUser.id;
        }
      }

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        try {
          // Merge auto-fields (JSON values override if explicitly provided)
          let processedItem = { ...autoFields, ...item };
          
          // Special processing for campuses - geocode + fetch branding
          if (entityType === 'campuses') {
            const needsGeocoding = !item.latitude || !item.longitude;
            const needsBranding = !item.primary_color || !item.logo_url;
            
            setUploadProgress({
              current: i + 1,
              total: data.length,
              name: item.name || item.title || `Item ${i + 1}`,
              step: needsGeocoding ? 'Geocoding...' : needsBranding ? 'Fetching branding...' : 'Saving...'
            });
            
            processedItem = await processCampusItem(item);
            
            if (needsGeocoding && processedItem.latitude && processedItem.longitude) {
              geocodedCount++;
            }
            if (needsBranding && (processedItem.primary_color || processedItem.logo_url)) {
              brandedCount++;
            }
            
            // Small delay between campuses to avoid rate limiting Wikipedia/Google
            if (i < data.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 600));
            }
          } else {
            setUploadProgress({
              current: i + 1,
              total: data.length,
              name: item.name || item.title || `Item ${i + 1}`,
              step: 'Saving...'
            });
          }
          
          await entity.create(processedItem);
          successCount++;
        } catch (error) {
          console.error('Error creating item:', error);
          errorCount++;
          errorMessages.push(`${item.name || item.title || `Item ${i+1}`}: ${error.message || 'Unknown error'}`);
        }
      }

      setUploadProgress(null);

      let message = `Successfully created ${successCount} items.`;
      if (geocodedCount > 0) {
        message += ` ${geocodedCount} geocoded.`;
      }
      if (brandedCount > 0) {
        message += ` ${brandedCount} branded (colors/logo).`;
      }
      if (errorCount > 0) {
        message += ` ${errorCount} failed.`;
      }

      setResult({
        success: successCount > 0,
        message,
        errors: errorMessages.length > 0 ? errorMessages.slice(0, 3) : null // Show first 3 errors
      });
    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'Failed to process data'
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const sampleData = {
    events: `[
  {
    "title": "Campus Concert",
    "description": "Annual spring concert",
    "category": "Social",
    "date": "2026-04-15",
    "time": "6:00 PM",
    "location": "Main Quad",
    "status": "approved"
  }
]`,
    places: `[
  {
    "name": "The Study Cafe",
    "description": "Great coffee and study space",
    "category": "cafe",
    "address": "123 College Ave",
    "rating": 4.5,
    "status": "approved"
  }
]`,
    opportunities: `[
  {
    "title": "Research Assistant",
    "description": "Help with AI research",
    "type": "research",
    "organization": "CS Department",
    "status": "approved"
  }
]`,
    groups: `[
  {
    "name": "Photography Club",
    "description": "For photography enthusiasts",
    "category": "Arts",
    "member_count": 50,
    "status": "approved"
  }
]`,
    campuses: `[
  {
    "name": "Emory University",
    "short_name": "Emory",
    "city": "Atlanta",
    "state": "GA"
  },
  {
    "name": "Massachusetts Institute of Technology",
    "short_name": "MIT",
    "city": "Cambridge",
    "state": "MA"
  }
]`
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout active="Batch Upload">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Batch Upload</h1>
        <p className="text-gray-600 mt-2">Import multiple records at once using JSON</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Entity Type</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="places">Places</SelectItem>
                  <SelectItem value="opportunities">Opportunities</SelectItem>
                  <SelectItem value="groups">Interest Groups</SelectItem>
                  <SelectItem value="campuses">Campuses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entityType !== 'campuses' && getCurrentUser()?.selected_campus_id && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Auto-linked to your campus</span>
                </p>
                <p className="text-xs text-green-700 mt-1">
                  campus_id and created_by are automatically set from your account.
                  You can override them by including these fields in your JSON.
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">JSON Data</label>
              <Textarea
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder="Paste your JSON array here..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            {uploadProgress && (
              <Alert className="border-blue-300 bg-blue-50">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-800">
                      Processing {uploadProgress.current}/{uploadProgress.total}: {uploadProgress.name}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {uploadProgress.step}
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <AlertDescription>
                  <div>{result.message}</div>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={uploading || !jsonData.trim()}
              className="w-full"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample Format</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Here's an example JSON format for {entityType}:
            </p>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              {sampleData[entityType]}
            </pre>
            {entityType === 'campuses' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Auto-enrichment for campuses
                </p>
                <ul className="text-xs text-blue-700 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Latitude & longitude are geocoded automatically from name + city/state</li>
                  <li>School colors and logo are fetched from Wikipedia</li>
                  <li>You can provide these fields manually to skip the lookup</li>
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setJsonData(sampleData[entityType])}
            >
              Use Sample Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

