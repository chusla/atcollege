import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  GraduationCap,
  Upload,
  MapPin
} from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated()) {
        navigate(createPageUrl('Landing'));
        return;
      }
      if (!isAdmin()) {
        navigate(createPageUrl('Home'));
        return;
      }
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const adminLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'AdminDashboard', description: 'Overview and stats' },
    { name: 'Content', icon: FileText, page: 'AdminContent', description: 'Manage listings' },
    { name: 'Import Places', icon: MapPin, page: 'AdminPlacesImport', description: 'Import from Google Maps' },
    { name: 'Users', icon: Users, page: 'AdminUsers', description: 'User management' },
    { name: 'Campuses', icon: GraduationCap, page: 'AdminCampuses', description: 'Campus settings' },
    { name: 'Batch Upload', icon: Upload, page: 'AdminBatchUpload', description: 'Bulk import data' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage your atCollege platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLinks.map((item) => (
            <Link key={item.page} to={createPageUrl(item.page)}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <item.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

