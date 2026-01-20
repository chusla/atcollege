import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, Briefcase, Users, ChevronRight, Loader2 } from 'lucide-react';
import { getPlaceImageUrl } from '@/utils/imageFallback';

export default function SearchResults({ results, query, loading, loadingMore, radius = '5', category = 'all' }) {
  if (loading) {
    return (
      <div className="space-y-6 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const totalResults = results.eventsCount + results.placesCount + results.opportunitiesCount + results.groupsCount;

  if (totalResults === 0 && !loadingMore) {
    return (
      <div className="text-center py-12 mb-10 animate-fade-in">
        <p className="text-gray-500">No results found for "{query}"</p>
      </div>
    );
  }

  // Placeholder image component with loading state
  const PlaceImage = ({ item }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const isLoadingDetails = item._isLoading;
    
    // Get the best available image - use contextual fallback instead of just showing icon
    const imageUrl = getPlaceImageUrl(item, 100);
    const hasValidImage = (item.image_url && !imageError) || imageUrl;

    if (isLoadingDetails) {
      return (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
          <div className="animate-pulse w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 relative">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
        )}
        <img
          src={imageError ? imageUrl : (item.image_url || imageUrl)}
          alt={item.title || item.name}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  const ResultSection = ({ title, icon: Icon, items, type, count, linkPage, isPlaces }) => {
    if (items.length === 0 && !loadingMore) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className="text-sm text-gray-500 tabular-nums transition-all">({count})</span>
            {isPlaces && loadingMore && (
              <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                Finding more...
              </span>
            )}
          </div>
          {count > 5 && (
            <Link
              to={`${createPageUrl(linkPage)}?search=${encodeURIComponent(query)}&radius=${radius}${category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''}`}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isTemp = item.id?.toString().startsWith('temp-');
            const itemLink = isTemp ? '#' : `${createPageUrl('Detail')}?type=${type}&id=${item.id}`;

            return (
              <Link
                key={item.id}
                to={itemLink}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isTemp ? 'cursor-default' : 'hover:bg-gray-50'}`}
                onClick={isTemp ? (e) => e.preventDefault() : undefined}
              >
                {isPlaces ? (
                  <PlaceImage item={item} />
                ) : (
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=100'}
                    alt={item.title || item.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">{item.title || item.name}</h4>
                    {item.status === 'pending' && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        New
                      </Badge>
                    )}
                    {item._isLoading && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                        <Loader2 className="w-2 h-2 animate-spin mr-1" />
                        Loading
                      </Badge>
                    )}
                  </div>
                  {item._isLoading ? (
                    <Skeleton className="h-4 w-3/4 mt-1" />
                  ) : (
                    <p className="text-sm text-gray-500 truncate transition-opacity">{item.description || item.category || item.type || item.address}</p>
                  )}
                </div>
              </Link>
            );
          })}
          {isPlaces && loadingMore && items.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-10 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="tabular-nums">{totalResults}</span> results for "{query}"
          {loadingMore && <span className="text-orange-600 ml-2">• Searching Google Places...</span>}
        </p>
      </div>

      <ResultSection
        title="Events"
        icon={Calendar}
        items={results.events}
        type="event"
        count={results.eventsCount}
        linkPage="Events"
      />
      <ResultSection
        title="Places"
        icon={Building2}
        items={results.places}
        type="place"
        count={results.placesCount}
        linkPage="Places"
        isPlaces={true}
      />
      <ResultSection
        title="Opportunities"
        icon={Briefcase}
        items={results.opportunities}
        type="opportunity"
        count={results.opportunitiesCount}
        linkPage="Opportunities"
      />
      <ResultSection
        title="Groups"
        icon={Users}
        items={results.groups}
        type="group"
        count={results.groupsCount}
        linkPage="Groups"
      />
    </div>
  );
}

