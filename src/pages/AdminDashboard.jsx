import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, Campus } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Building2, Briefcase, Users, GraduationCap, TrendingUp } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    events: 0,
    places: 0,
    opportunities: 0,
    groups: 0,
    campuses: 0,
    users: 0
  });
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
      loadStats();
    }
  }, [authLoading]);

  const loadStats = async () => {
    try {
      const [events, places, opps, groups, campuses] = await Promise.all([
        Event.list(),
        Place.list(),
        Opportunity.list(),
        InterestGroup.list(),
        Campus.list()
      ]);

      // Get user count from profiles
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        events: (events || []).length,
        places: (places || []).length,
        opportunities: (opps || []).length,
        groups: (groups || []).length,
        campuses: (campuses || []).length,
        users: count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'Events', value: stats.events, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Places', value: stats.places, icon: Building2, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Opportunities', value: stats.opportunities, icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-100' },
    { name: 'Groups', value: stats.groups, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Campuses', value: stats.campuses, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { name: 'Users', value: stats.users, icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-100' },
  ];

  return (
    <AdminLayout active="Dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}

