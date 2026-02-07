import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { SiteSetting } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Settings, Type, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminSettings() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading, profileLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Content settings state
  const [settings, setSettings] = useState({
    // Landing page branding
    logo_tagline: 'Social Life in and Around Campus',
    hero_pre_title: 'Your College Experience Starts Here',
    tagline_bar: 'atCollege is a real-time network about social life in and around campus ...',

    // Landing page hero
    hero_title: 'Social Life in and Around Campus',
    hero_subtitle: 'Discover events, places, opportunities, and groups near your university',
    hero_image_url: '',
    
    // Section titles
    events_section_title: 'Featured Events',
    places_section_title: 'Popular Places',
    opportunities_section_title: 'Volunteer / Work',
    groups_section_title: 'Interest Groups',
    
    // Home page
    home_welcome_message: 'What are you up to?',
    home_welcome_subtitle: 'Submit one option. You can always return to this page to submit other options',
  });

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
      loadSettings();
    }
  }, [authLoading, profileLoaded]);

  const loadSettings = async () => {
    try {
      // Load all settings
      const allSettings = await SiteSetting.getAll();
      
      // Convert to object format
      const settingsObj = {};
      allSettings.forEach(s => {
        settingsObj[s.setting_key] = s.setting_value;
      });

      // If hero_image_url wasn't explicitly set, populate from legacy hero_image object
      if (!settingsObj.hero_image_url && settingsObj.hero_image?.url) {
        settingsObj.hero_image_url = settingsObj.hero_image.url;
      }

      // Only merge known admin keys to avoid saving stale/unrelated DB keys back
      const adminKeys = Object.keys(settings);
      const filtered = {};
      adminKeys.forEach(key => {
        if (settingsObj[key] !== undefined) {
          filtered[key] = settingsObj[key];
        }
      });

      // Merge with defaults
      setSettings(prev => ({
        ...prev,
        ...filtered
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    try {
      // Save each setting individually so one failure doesn't block others
      const results = await Promise.allSettled(
        Object.entries(settings).map(([key, value]) => 
          SiteSetting.setValue(key, value, `Site setting: ${key}`)
        )
      );
      
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some settings failed to save:', failures.map(f => f.reason?.message || f.reason));
        setSaveMessage({ 
          type: 'error', 
          text: `Failed to save ${failures.length} setting(s): ${failures[0].reason?.message || 'Unknown error'}` 
        });
      } else {
        setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({ type: 'error', text: `Failed to save settings: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout active="Settings">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Site Settings</h1>
        <p className="text-gray-600 mt-2">Edit page content and site configuration</p>
      </div>

      {saveMessage && (
        <Alert className={`mb-6 ${saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <AlertCircle className={`h-4 w-4 ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
          <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {saveMessage.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Landing Page Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Landing Page Hero
            </CardTitle>
            <CardDescription>
              These fields appear on the <strong>Landing page</strong> (first screen visitors see). Edit the main hero section text and background image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logo_tagline">Logo Tagline</Label>
              <Input
                id="logo_tagline"
                value={settings.logo_tagline}
                onChange={(e) => updateSetting('logo_tagline', e.target.value)}
                placeholder="Social Life in and Around Campus"
              />
              <p className="text-xs text-gray-500 mt-1">→ Shown next to the <strong>atCollege</strong> logo in the top-left of the <strong>Landing page</strong></p>
            </div>
            <div>
              <Label htmlFor="hero_pre_title">Hero Pre-Title</Label>
              <Input
                id="hero_pre_title"
                value={settings.hero_pre_title}
                onChange={(e) => updateSetting('hero_pre_title', e.target.value)}
                placeholder="Your College Experience Starts Here"
              />
              <p className="text-xs text-gray-500 mt-1">→ Small text shown above the main hero title on the <strong>Landing page</strong></p>
            </div>
            <div>
              <Label htmlFor="hero_title">Hero Title</Label>
              <Input
                id="hero_title"
                value={settings.hero_title}
                onChange={(e) => updateSetting('hero_title', e.target.value)}
                placeholder="Social Life in and Around Campus"
              />
              <p className="text-xs text-gray-500 mt-1">→ Shown as the large headline on the <strong>Landing page</strong> hero (top of the page)</p>
            </div>
            <div>
              <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
              <Textarea
                id="hero_subtitle"
                value={settings.hero_subtitle}
                onChange={(e) => updateSetting('hero_subtitle', e.target.value)}
                placeholder="Discover events, places, opportunities, and groups..."
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">→ Shown directly under the hero title on the <strong>Landing page</strong></p>
            </div>
            <div>
              <Label htmlFor="hero_image_url">Hero Background Image URL (optional)</Label>
              <Input
                id="hero_image_url"
                value={settings.hero_image_url}
                onChange={(e) => updateSetting('hero_image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">→ Background image behind the hero text on the <strong>Landing page</strong></p>
            </div>
            <div>
              <Label htmlFor="tagline_bar">Tagline Bar</Label>
              <Input
                id="tagline_bar"
                value={settings.tagline_bar}
                onChange={(e) => updateSetting('tagline_bar', e.target.value)}
                placeholder="atCollege is a real-time network about social life in and around campus ..."
              />
              <p className="text-xs text-gray-500 mt-1">→ Text shown in the dark bar below the stats on the <strong>Landing page</strong></p>
            </div>
          </CardContent>
        </Card>

        {/* Section Titles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Section Titles
            </CardTitle>
            <CardDescription>
              Section titles appear on both the <strong>Landing page</strong> and the <strong>Home page</strong> (logged-in users). Each field controls the heading for that section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="events_section_title">Events Section</Label>
                <Input
                  id="events_section_title"
                  value={settings.events_section_title}
                  onChange={(e) => updateSetting('events_section_title', e.target.value)}
                  placeholder="Featured Events"
                />
                <p className="text-xs text-gray-500 mt-1">→ <strong>Landing</strong> and <strong>Home</strong>: &quot;Events&quot; section title</p>
              </div>
              <div>
                <Label htmlFor="places_section_title">Places Section</Label>
                <Input
                  id="places_section_title"
                  value={settings.places_section_title}
                  onChange={(e) => updateSetting('places_section_title', e.target.value)}
                  placeholder="Popular Places"
                />
                <p className="text-xs text-gray-500 mt-1">→ <strong>Landing</strong> and <strong>Home</strong>: &quot;Places&quot; section title</p>
              </div>
              <div>
                <Label htmlFor="opportunities_section_title">Opportunities Section</Label>
                <Input
                  id="opportunities_section_title"
                  value={settings.opportunities_section_title}
                  onChange={(e) => updateSetting('opportunities_section_title', e.target.value)}
                  placeholder="Volunteer / Work"
                />
                <p className="text-xs text-gray-500 mt-1">→ <strong>Landing</strong> and <strong>Home</strong>: &quot;Opportunities&quot; section title</p>
              </div>
              <div>
                <Label htmlFor="groups_section_title">Groups Section</Label>
                <Input
                  id="groups_section_title"
                  value={settings.groups_section_title}
                  onChange={(e) => updateSetting('groups_section_title', e.target.value)}
                  placeholder="Interest Groups"
                />
                <p className="text-xs text-gray-500 mt-1">→ <strong>Landing</strong>: &quot;Groups&quot; section title</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Home Page */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Home Page
            </CardTitle>
            <CardDescription>
              These fields appear only on the <strong>Home page</strong> (after a user is logged in), below &quot;Welcome back, [Name]&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="home_welcome_message">Welcome Message</Label>
              <Input
                id="home_welcome_message"
                value={settings.home_welcome_message}
                onChange={(e) => updateSetting('home_welcome_message', e.target.value)}
                placeholder="What are you up to?"
              />
              <p className="text-xs text-gray-500 mt-1">→ <strong>Home page</strong>: the line shown directly under &quot;Welcome back, [Name]&quot;</p>
            </div>
            <div>
              <Label htmlFor="home_welcome_subtitle">Welcome Subtitle</Label>
              <Input
                id="home_welcome_subtitle"
                value={settings.home_welcome_subtitle}
                onChange={(e) => updateSetting('home_welcome_subtitle', e.target.value)}
                placeholder="Submit one option..."
              />
              <p className="text-xs text-gray-500 mt-1">→ <strong>Home page</strong>: the smaller line under the welcome message</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
