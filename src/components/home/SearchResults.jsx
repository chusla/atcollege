import React, { useState, memo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, Briefcase, Users, ChevronRight, Loader2 } from 'lucide-react';

// Memoized image component - defined outside to prevent recreation
const PlaceImage = memo(function PlaceImage({ imageUrl, name, isLoading }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);
  
  // Check if image is already cached/loaded
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalHeight > 0) {
      setImageLoaded(true);
    }
  }, []);
  
  const hasImage = imageUrl && !imageError;
  
  if (isLoading || !hasImage) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <Building2 className="w-5 h-5 text-gray-400" />
        )}
      </div>
    );
  }
  
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      <img
        ref={imgRef}
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover"
        style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        loading="lazy"
      />
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props actually changed
  return prevProps.imageUrl === nextProps.imageUrl && 
         prevProps.name === nextProps.name && 
         prevProps.isLoading === nextProps.isLoading;
});

// Memoized result item to prevent re-renders
const ResultItem = memo(function ResultItem({ item, type, isPlaces }) {
  const isTemp = item.id?.toString().startsWith('temp-');
  const itemLink = isTemp ? '#' : `${createPageUrl('Detail')}?type=${type}&id=${item.id}`;
  
  return (
    <Link
      to={itemLink}
      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isTemp ? 'cursor-default' : 'hover:bg-gray-50'}`}
      onClick={isTemp ? (e) => e.preventDefault() : undefined}
    >
      {isPlaces ? (
        <PlaceImage 
          imageUrl={item.image_url} 
          name={item.title || item.name} 
          isLoading={item._isLoading}
        />
      ) : (
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=100'}
          alt={item.title || item.name}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">{item.title || item.name}</h4>
          {item.status === 'pending' && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 flex-shrink-0">
              New
            </Badge>
          )}
          {item._isLoading && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200 flex-shrink-0">
              <Loader2 className="w-2 h-2 animate-spin mr-1" />
              Loading
            </Badge>
          )}
        </div>
        {item._isLoading ? (
          <Skeleton className="h-4 w-3/4 mt-1" />
        ) : (
          <p className="text-sm text-gray-500 truncate">{item.description || item.category || item.type || item.address}</p>
        )}
      </div>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if important props changed
  const prev = prevProps.item;
  const next = nextProps.item;
  return prev.id === next.id && 
         prev.image_url === next.image_url && 
         prev.name === next.name &&
         prev.title === next.title &&
         prev._isLoading === next._isLoading &&
         prev.status === next.status;
});

export default function SearchResults({ results, query, loading, loadingMore }) {
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
          {count > 0 && (
            <Link
              to={`${createPageUrl(linkPage)}?search=${encodeURIComponent(query)}`}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all {count > 5 && `(${count})`}
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <ResultItem 
              key={item.google_place_id || item.id} 
              item={item} 
              type={type} 
              isPlaces={isPlaces} 
            />
          ))}
          {isPlaces && loadingMore && items.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
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
          {loadingMore && <span className="text-orange-600 ml-2">• Finding more places near campus...</span>}
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
