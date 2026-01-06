import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup } from '@/api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Building2, Briefcase, Users, Check, X, Trash2 } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminContent() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const loadContent = async () => {
    try {
      const [eventsData, placesData, oppsData, groupsData] = await Promise.all([
        Event.list(),
        Place.list(),
        Opportunity.list(),
        InterestGroup.list()
      ]);
      setEvents(eventsData || []);
      setPlaces(placesData || []);
      setOpportunities(oppsData || []);
      setGroups(groupsData || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[status] || colors.pending}>{status}</Badge>;
  };

  const ContentTable = ({ items, type }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title/Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.title || item.name}</TableCell>
            <TableCell>{item.category || item.type || '-'}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
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

