import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Star, MapPin } from 'lucide-react';

export default function PlaceCard({ place, onSave, isSaved }) {
  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(place);
  };

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

          {/* Category Badge */}
          {place.category && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-green-600 text-white text-xs rounded-full">
              {place.category}
            </div>
          )}

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
              {place.name}
            </h3>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              {place.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {place.rating.toFixed(1)}
                </div>
              )}
              {place.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{place.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

