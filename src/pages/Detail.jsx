import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Event, Place, Opportunity, InterestGroup, Comment, SavedItem } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, Clock, Star, Heart, Users, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/components/maps/GoogleMapsProvider';
import ThreadedComment from '../components/detail/ThreadedComment';
import { getPlaceImageUrl, getFallbackImageUrl } from '@/utils/imageFallback';

export default function Detail() {
  const { isAuthenticated, getCurrentUser, signInWithGoogle } = useAuth();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [item, setItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  const user = getCurrentUser();
  const urlParams = new URLSearchParams(window.location.search);
  const itemType = urlParams.get('type');
  const itemId = urlParams.get('id');

  useEffect(() => {
    // Scroll to top when navigating to detail page
    window.scrollTo(0, 0);
    loadData();
  }, [itemId, itemType]);

  const loadData = async () => {
    setLoading(true);
    try {
      let data;
      switch (itemType) {
        case 'event': data = await Event.get(itemId); break;
        case 'place': data = await Place.get(itemId); break;
        case 'opportunity': data = await Opportunity.get(itemId); break;
        case 'group': data = await InterestGroup.get(itemId); break;
        default: return;
      }
      setItem(data);

      const allComments = await Comment.filter({
        item_type: itemType,
        item_id: itemId
      });

      const threadedComments = buildCommentTree(allComments || []);
      setComments(threadedComments);

      if (isAuthenticated() && user) {
        const saved = await SavedItem.filter({
          item_type: itemType,
          item_id: itemId,
          user_id: user.id
        });
        setIsSaved((saved || []).length > 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const buildCommentTree = (allComments) => {
    const commentMap = {};
    const rootComments = [];

    allComments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    allComments.forEach(comment => {
      if (comment.parent_id) {
        if (commentMap[comment.parent_id]) {
          commentMap[comment.parent_id].replies.push(commentMap[comment.id]);
        }
      } else {
        rootComments.push(commentMap[comment.id]);
      }
    });

    return rootComments;
  };

  const handleAddComment = async () => {
    if (!isAuthenticated()) {
      signInWithGoogle();
      return;
    }

    if (!newComment.trim()) return;

    await Comment.create({
      content: newComment,
      item_type: itemType,
      item_id: itemId,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email
    });

    setNewComment('');
    loadData();
  };

  const handleReply = async (parentId, content) => {
    if (!isAuthenticated()) {
      signInWithGoogle();
      return;
    }

    await Comment.create({
      content,
      item_type: itemType,
      item_id: itemId,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email,
      parent_id: parentId
    });

    loadData();
  };

  const handleSave = async () => {
    if (!isAuthenticated()) {
      signInWithGoogle();
      return;
    }

    if (isSaved) {
      const saved = await SavedItem.filter({
        item_type: itemType,
        item_id: itemId,
        user_id: user.id
      });
      if (saved && saved.length > 0) {
        await SavedItem.delete(saved[0].id);
        setIsSaved(false);
      }
    } else {
      await SavedItem.create({
        item_type: itemType,
        item_id: itemId,
        user_id: user.id
      });
      setIsSaved(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Item not found</p>
      </div>
    );
  }

  const hasLocation = item.latitude && item.longitude;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hero Image */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
              <div className="aspect-[16/9] relative">
                <img
                  src={
                    heroImgError && itemType === 'place'
                      ? getFallbackImageUrl(item, 800)
                      : itemType === 'place'
                        ? getPlaceImageUrl(item, 800)
                        : (item.image_url || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800')
                  }
                  alt={item.title || item.name}
                  onError={() => { if (itemType === 'place') setHeroImgError(true); }}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Info Card */}
            <Card className="p-4 lg:p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {item.title || item.name}
                  </h1>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.category && (
                      <Badge className="bg-blue-100 text-blue-700">{item.category}</Badge>
                    )}
                    {item.type && (
                      <Badge className="bg-orange-100 text-orange-700">{item.type}</Badge>
                    )}
                    {item.rating && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {item.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'fill-orange-500 text-orange-500' : ''}`} />
                </Button>
              </div>

              {item.description && (
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{item.description}</p>
              )}

              <div className="space-y-3 text-sm">
                {item.date && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="w-5 h-5" />
                    <span>{format(new Date(item.date), 'MMMM d, yyyy')}</span>
                  </div>
                )}
                {item.time && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Clock className="w-5 h-5" />
                    <span>{item.time.slice(0, 5)}</span>
                  </div>
                )}
                {(item.location || item.address) && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin className="w-5 h-5" />
                    <span>{item.location || item.address}</span>
                  </div>
                )}
                {item.organization && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Briefcase className="w-5 h-5" />
                    <span>{item.organization}</span>
                  </div>
                )}
                {item.member_count !== undefined && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Users className="w-5 h-5" />
                    <span>{item.member_count} Members</span>
                  </div>
                )}
                {item.deadline && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="w-5 h-5" />
                    <span>Deadline: {format(new Date(item.deadline), 'MMMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Comments Section */}
            <Card className="p-4 lg:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Discussion ({comments.length})
              </h2>

              {/* Add Comment */}
              <div className="mb-6">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={isAuthenticated() ? "Share your thoughts..." : "Sign in to comment"}
                  className="mb-3"
                  rows={4}
                  disabled={!isAuthenticated()}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!isAuthenticated() || !newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Post Comment
                </Button>
              </div>

              {/* Comments */}
              <div className="space-y-1">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <ThreadedComment
                      key={comment.id}
                      comment={comment}
                      onReply={handleReply}
                    />
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {hasLocation && (
              <Card className="p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
                <div className="h-64 rounded-lg overflow-hidden bg-gray-100">
                  {mapsLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) }}
                      zoom={15}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                        zoomControl: true,
                      }}
                    >
                      <Marker
                        position={{ lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) }}
                        title={item.title || item.name}
                      />
                    </GoogleMap>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">{item.location || item.address}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

