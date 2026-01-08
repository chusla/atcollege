import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Star, MapPin } from 'lucide-react';
import { mapLLMCategoryToSchema } from '@/api/llmCategorization';

export default function PlaceCard({ place, onSave, isSaved }) {
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
      className="group block"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
        <div className="aspect-[4/5] relative">
          <img
            src={place.image_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400'}
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Save Button */}
          <button
            onClick={handleSaveClick}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${isSaved ? 'fill-orange-500 text-orange-500' : 'text-gray-600'}`}
            />
          </button>

          {/* Badges Container */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
            {/* Category Badge */}
            {displayCategory && (
              <div className="px-2 py-1 bg-green-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-full shadow-sm">
                {displayCategory}
              </div>
            )}

            {/* Rating Badge */}
            {place.rating && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-medium rounded-full shadow-sm">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{place.rating.toFixed(1)}</span>
                {place.user_ratings_total > 0 && (
                  <span className="text-gray-500">({place.user_ratings_total})</span>
                )}
              </div>
            )}
          </div>

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1.5 drop-shadow-sm">
              {place.name}
            </h3>
            <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
              {place.address && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-white/80" />
                  <span className="truncate drop-shadow-sm">{place.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

