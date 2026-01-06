import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Campus, Place } from '@/api/entities';
import { searchNearby, categoryToGoogleType, milesToMeters } from '@/api/googlePlaces';
import AdminLayout from '../components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Search, Check, X, Loader2, MapPin } from 'lucide-react';

export default function AdminPlacesImport() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('bars');
  const [radius, setRadius] = useState('5');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

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
      const data = await Campus.list();
      setCampuses(data || []);
      if (data && data.length > 0) {
        setSelectedCampus(data[0].id);
      }
    } catch (error) {
      console.error('Error loading campuses:', error);
    }
  };

  const handleSearch = async () => {
    if (!selectedCampus) {
      alert('Please select a campus');
      return;
    }

    setLoading(true);
    try {
      const campus = await Campus.get(selectedCampus);
      if (!campus?.latitude || !campus?.longitude) {
        alert('Campus location not available');
        return;
      }

      const location = {
        lat: parseFloat(campus.latitude),
        lng: parseFloat(campus.longitude)
      };

      const radiusMeters = milesToMeters(parseFloat(radius));
      const googleType = categoryToGoogleType(selectedCategory);

      const results = await searchNearby(location, radiusMeters, googleType);
      
      // Check which places already exist
      const resultsWithStatus = await Promise.all(
        results.map(async (place) => {
          const existing = await Place.findByGooglePlaceId(place.google_place_id);
          return {
            ...place,
            exists: !!existing,
            existingId: existing?.id
          };
        })
      );

      setSearchResults(resultsWithStatus);
      setSelectedPlaces(new Set());
    } catch (error) {
      console.error('Error searching places:', error);
      alert('Failed to search places');
    } finally {
      setLoading(false);
    }
  };

  const togglePlaceSelection = (placeId) => {
    const newSelected = new Set(selectedPlaces);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    setSelectedPlaces(newSelected);
  };

  const handleImport = async () => {
    if (selectedPlaces.size === 0) {
      alert('Please select at least one place to import');
      return;
    }

    setImporting(true);
    try {
      const placesToImport = searchResults.filter(p => selectedPlaces.has(p.google_place_id));
      const imported = [];
      const errors = [];

      for (const place of placesToImport) {
        try {
          if (place.exists) {
            imported.push({ ...place, status: 'skipped', reason: 'Already exists' });
            continue;
          }

          const newPlace = await Place.createFromGooglePlace(place, selectedCampus);
          imported.push({ ...newPlace, status: 'imported' });
        } catch (error) {
          errors.push({ ...place, error: error.message });
        }
      }

      alert(`Imported ${imported.filter(p => p.status === 'imported').length} places. ${errors.length} errors.`);
      
      // Refresh search results to show updated status
      await handleSearch();
    } catch (error) {
      console.error('Error importing places:', error);
      alert('Failed to import places');
    } finally {
      setImporting(false);
    }
  };

  const selectAll = () => {
    const newSelected = new Set(
      searchResults
        .filter(p => !p.exists)
        .map(p => p.google_place_id)
    );
    setSelectedPlaces(newSelected);
  };

  const deselectAll = () => {
    setSelectedPlaces(new Set());
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout active="PlacesImport">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import Places Near Campus</h1>
        <p className="text-gray-600 mt-2">Search and import places around campuses</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="campus">Campus</Label>
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campus" />
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

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bars">Bars</SelectItem>
                  <SelectItem value="restaurants">Restaurants</SelectItem>
                  <SelectItem value="cafes">Cafes</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="library">Library</SelectItem>
                  <SelectItem value="study_spot">Study Spots</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="radius">Radius (miles)</Label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mile</SelectItem>
                  <SelectItem value="2">2 miles</SelectItem>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="20">20 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading || !selectedCampus} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Search Results ({searchResults.length} places found)
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All New
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>
                  Deselect All
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || selectedPlaces.size === 0}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Import Selected ({selectedPlaces.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((place) => (
                  <TableRow key={place.google_place_id}>
                    <TableCell>
                      {!place.exists && (
                        <input
                          type="checkbox"
                          checked={selectedPlaces.has(place.google_place_id)}
                          onChange={() => togglePlaceSelection(place.google_place_id)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{place.name}</TableCell>
                    <TableCell>{place.address}</TableCell>
                    <TableCell>
                      {place.rating ? (
                        <div className="flex items-center gap-1">
                          <span>{place.rating}</span>
                          <span className="text-gray-400">({place.user_ratings_total || 0})</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {place.exists ? (
                        <Badge variant="outline">Already Exists</Badge>
                      ) : (
                        <Badge>New</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}

