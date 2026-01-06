import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, Campus } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminBatchUpload() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [entityType, setEntityType] = useState('events');
  const [jsonData, setJsonData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

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
    }
  }, [authLoading]);

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

      for (const item of data) {
        try {
          await entity.create(item);
          successCount++;
        } catch (error) {
          console.error('Error creating item:', error);
          errorCount++;
        }
      }

      setResult({
        success: true,
        message: `Successfully created ${successCount} items. ${errorCount > 0 ? `${errorCount} failed.` : ''}`
      });
    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'Failed to process data'
      });
    } finally {
      setUploading(false);
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
    "name": "University of Example",
    "short_name": "UoE",
    "city": "Example City",
    "state": "CA"
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

            {result && (
              <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={uploading || !jsonData.trim()}
              className="w-full"
            >
              {uploading ? (
                <>Processing...</>
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

