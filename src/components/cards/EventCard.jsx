import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function EventCard({ event, onSave, isSaved }) {
  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(event);
  };

  return (
    <Link
      to={`${createPageUrl('Detail')}?type=event&id=${event.id}`}
      className="group block"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
        <div className="aspect-[4/5] relative">
          <img
            src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400'}
            alt={event.title}
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
          {event.category && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
              {event.category}
            </div>
          )}

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
              {event.title}
            </h3>
            {event.date && (
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <Calendar className="w-3 h-3" />
                {format(new Date(event.date), 'MMM d, yyyy')}
              </div>
            )}
            {event.time && (
              <div className="flex items-center gap-1 text-white/80 text-xs mt-1">
                <Clock className="w-3 h-3" />
                {event.time.slice(0, 5)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

