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
import { GraduationCap, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '../components/layout/AdminLayout';

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
    image_url: ''
  });

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
        image_url: formData.image_url || null
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
      setFormData({ name: '', location: '', latitude: '', longitude: '', image_url: '' });
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
      image_url: campus.image_url || ''
    });
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
    setFormData({ name: '', location: '', latitude: '', longitude: '', image_url: '' });
    setDialogOpen(true);
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
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Campus
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCampus ? 'Edit Campus' : 'Add New Campus'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-xs text-gray-500">
                💡 Tip: Search the campus on Google Maps, right-click, and select "What's here?" to get coordinates.
              </p>
              <div>
                <Label htmlFor="image_url">Image URL (optional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCampus ? 'Update Campus' : 'Add Campus'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campus</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No campuses yet. Click "Add Campus" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                campuses.map((campus) => (
                  <TableRow key={campus.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium">{campus.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{campus.location || '—'}</TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
