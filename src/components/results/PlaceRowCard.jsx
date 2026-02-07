import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Star, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { mapLLMCategoryToSchema } from '@/api/llmCategorization';
import { getPlaceImageUrl, getFallbackImageUrl } from '@/utils/imageFallback';

export default function PlaceRowCard({ place, onSave, isSaved }) {
  const primaryUrl = getPlaceImageUrl(place, 200);
  const [imageUrl, setImageUrl] = useState(primaryUrl);

  const handleImageError = () => {
    const fallback = getFallbackImageUrl(place, 200);
    if (imageUrl !== fallback) {
      setImageUrl(fallback);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(place);
  };

  // Get display category: use category if available, otherwise normalize llm_category, fallback to 'Other'
  const displayCategory = place.category || (place.llm_category ? mapLLMCategoryToSchema(place.llm_category) : 'Other');

  return (
    <Link
      to={`${createPageUrl('Detail')}?type=place&id=${place.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <img
            src={imageUrl}
            alt={place.name}
            onError={handleImageError}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{place.name}</h3>
                {displayCategory && (
                  <Badge className="bg-green-100 text-green-700 text-xs">{displayCategory}</Badge>
                )}
              </div>
              <button
                onClick={handleSaveClick}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-orange-500 text-orange-500' : 'text-gray-400'}`} />
              </button>
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {place.rating && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-gray-900">{place.rating.toFixed(1)}</span>
                  {place.user_ratings_total > 0 && (
                    <span className="text-gray-400">({place.user_ratings_total})</span>
                  )}
                </div>
              )}
              {place.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {place.address}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

