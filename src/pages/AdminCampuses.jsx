import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Campus } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminCampuses() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    city: '',
    state: '',
    address: '',
    website: ''
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
      if (editingCampus) {
        await Campus.update(editingCampus.id, formData);
      } else {
        await Campus.create(formData);
      }
      setDialogOpen(false);
      setEditingCampus(null);
      setFormData({ name: '', short_name: '', city: '', state: '', address: '', website: '' });
      loadCampuses();
    } catch (error) {
      console.error('Error saving campus:', error);
      alert('Failed to save campus');
    }
  };

  const handleEdit = (campus) => {
    setEditingCampus(campus);
    setFormData({
      name: campus.name || '',
      short_name: campus.short_name || '',
      city: campus.city || '',
      state: campus.state || '',
      address: campus.address || '',
      website: campus.website || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campus?')) return;
    try {
      await Campus.delete(id);
      loadCampuses();
    } catch (error) {
      console.error('Error deleting campus:', error);
    }
  };

  const handleOpenDialog = () => {
    setEditingCampus(null);
    setFormData({ name: '', short_name: '', city: '', state: '', address: '', website: '' });
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
          <p className="text-gray-600 mt-2">Add and manage universities</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Campus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCampus ? 'Edit Campus' : 'Add New Campus'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Campus Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="short_name">Short Name</Label>
                <Input
                  id="short_name"
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  placeholder="e.g., UCLA"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
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
                <TableHead>Website</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campuses.map((campus) => (
                <TableRow key={campus.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium">{campus.name}</span>
                        {campus.short_name && (
                          <span className="text-gray-500 ml-2">({campus.short_name})</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{campus.city}, {campus.state}</TableCell>
                  <TableCell>
                    {campus.website && (
                      <a href={campus.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Visit
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(campus)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(campus.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

