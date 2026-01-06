import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Users } from 'lucide-react';

export default function GroupCard({ group, onSave, isSaved }) {
  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(group);
  };

  return (
    <Link 
      to={`${createPageUrl('Detail')}?type=group&id=${group.id}`}
      className="group block"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
        <div className="aspect-square relative">
          <img
            src={group.image_url || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400'}
            alt={group.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Save Button */}
          {onSave && (
            <button
              onClick={handleSaveClick}
              className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
            >
              <Heart 
                className={`w-3 h-3 ${isSaved ? 'fill-orange-500 text-orange-500' : 'text-gray-600'}`}
              />
            </button>
          )}

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <h3 className="text-white font-semibold text-xs line-clamp-2 mb-1">
              {group.name}
            </h3>
            {group.member_count !== undefined && (
              <div className="flex items-center gap-1 text-white/80 text-[10px]">
                <Users className="w-2.5 h-2.5" />
                {group.member_count} members
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

