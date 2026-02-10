import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Users, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GroupRowCard({ group, onSave, isSaved }) {
  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(group);
  };

  return (
    <Link
      to={`${createPageUrl('Detail')}?type=group&id=${group.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <img
            src={group.image_url || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200'}
            alt={group.name}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
                {group.category && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">{group.category}</Badge>
                )}
              </div>
              {onSave && (
                <button
                  onClick={handleSaveClick}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'fill-orange-500 text-orange-500' : 'text-gray-400'}`} />
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {group.member_count !== undefined && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {group.member_count} members
                </div>
              )}
              {group.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{group.location}</span>
                </div>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{group.description}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
