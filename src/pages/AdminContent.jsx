import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup } from '@/api/entities';
import { categorizePlace } from '@/api/llmCategorization';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Building2, Briefcase, Users, Check, X, Trash2, Sparkles, Filter } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminContent() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placesFilter, setPlacesFilter] = useState('all'); // all, google_maps, user_submitted
  const [categorizationFilter, setCategorizationFilter] = useState('all'); // all, pending, processing, completed, failed

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
      loadContent();
    }
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading && isAuthenticated() && isAdmin()) {
      loadContent();
    }
  }, [placesFilter, categorizationFilter]);

  const loadContent = async () => {
    try {
      const [eventsData, placesData, oppsData, groupsData] = await Promise.all([
        Event.list(),
        Place.list(),
        Opportunity.list(),
        InterestGroup.list()
      ]);
      setEvents(eventsData || []);
      
      // Filter places based on selected filters
      let filteredPlaces = placesData || [];
      if (placesFilter !== 'all') {
        filteredPlaces = filteredPlaces.filter(p => p.source === placesFilter);
      }
      if (categorizationFilter !== 'all') {
        filteredPlaces = filteredPlaces.filter(p => p.categorization_status === categorizationFilter);
      }
      
      setPlaces(filteredPlaces);
      setOpportunities(oppsData || []);
      setGroups(groupsData || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated() && isAdmin()) {
      loadContent();
    }
  }, [placesFilter, categorizationFilter]);

  const handleApprove = async (type, id) => {
    try {
      const entity = { Event, Place, Opportunity, InterestGroup }[type];
      await entity.update(id, { status: 'approved' });
      loadContent();
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async (type, id) => {
    try {
      const entity = { Event, Place, Opportunity, InterestGroup }[type];
      await entity.update(id, { status: 'rejected' });
      loadContent();
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const entity = { Event, Place, Opportunity, InterestGroup }[type];
      await entity.delete(id);
      loadContent();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleCategorize = async (placeId) => {
    try {
      await categorizePlace(placeId);
      loadContent();
    } catch (error) {
      console.error('Error categorizing place:', error);
      alert('Failed to categorize place');
    }
  };

  const handleEditCategory = async (placeId, newCategory) => {
    try {
      await Place.update(placeId, { category: newCategory });
      loadContent();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[status] || colors.pending}>{status}</Badge>;
  };

  const CategorizationStatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[status] || colors.pending}>{status || 'pending'}</Badge>;
  };

  const ContentTable = ({ items, type }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title/Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          {type === 'Place' && <TableHead>Categorization</TableHead>}
          {type === 'Place' && <TableHead>Source</TableHead>}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.title || item.name}</TableCell>
            <TableCell>
              {type === 'Place' && item.source === 'google_maps' ? (
                <Select
                  value={item.category || item.llm_category || 'Other'}
                  onValueChange={(value) => handleEditCategory(item.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bars">Bars</SelectItem>
                    <SelectItem value="Restaurants">Restaurants</SelectItem>
                    <SelectItem value="Cafes">Cafes</SelectItem>
                    <SelectItem value="Gym">Gym</SelectItem>
                    <SelectItem value="Library">Library</SelectItem>
                    <SelectItem value="Study Spots">Study Spots</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                item.category || item.type || '-'
              )}
            </TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            {type === 'Place' && (
              <TableCell>
                <div className="flex flex-col gap-1">
                  <CategorizationStatusBadge status={item.categorization_status} />
                  {item.llm_category && (
                    <span className="text-xs text-gray-500">LLM: {item.llm_category}</span>
                  )}
                  {item.llm_category_confidence && (
                    <span className="text-xs text-gray-400">
                      {(item.llm_category_confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              </TableCell>
            )}
            {type === 'Place' && (
              <TableCell>
                <Badge variant={item.source === 'google_maps' ? 'default' : 'outline'}>
                  {item.source === 'google_maps' ? 'Google Maps' : item.source || 'User'}
                </Badge>
              </TableCell>
            )}
            <TableCell>
              <div className="flex gap-2">
                {item.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleApprove(type, item.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(type, item.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {type === 'Place' && item.source === 'google_maps' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCategorize(item.id)}
                    disabled={item.categorization_status === 'processing'}
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => handleDelete(type, item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout active="Content">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-2">Review and manage listings</p>
      </div>

      <Tabs defaultValue="events">
        <TabsList className="mb-6">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="places" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Places ({places.length})
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Groups ({groups.length})
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="events">
              <ContentTable items={events} type="Event" />
            </TabsContent>
            <TabsContent value="places">
              <div className="mb-4 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={placesFilter} onValueChange={setPlacesFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="google_maps">Google Maps</SelectItem>
                      <SelectItem value="user_submitted">User Submitted</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={categorizationFilter} onValueChange={setCategorizationFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ContentTable items={places} type="Place" />
            </TabsContent>
            <TabsContent value="opportunities">
              <ContentTable items={opportunities} type="Opportunity" />
            </TabsContent>
            <TabsContent value="groups">
              <ContentTable items={groups} type="InterestGroup" />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </AdminLayout>
  );
}

