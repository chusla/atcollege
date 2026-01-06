import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function EventRowCard({ event, onSave, isSaved }) {
  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(event);
  };

  return (
    <Link
      to={`${createPageUrl('Detail')}?type=event&id=${event.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <img
            src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200'}
            alt={event.title}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                {event.category && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{event.category}</Badge>
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
              {event.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(event.start_date), 'MMM d, yyyy')}
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

