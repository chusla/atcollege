import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Briefcase, Building2 } from 'lucide-react';

export default function OpportunityCard({ opportunity, onSave, isSaved }) {
  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(opportunity);
  };

  return (
    <Link 
      to={`${createPageUrl('Detail')}?type=opportunity&id=${opportunity.id}`}
      className="group block"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
        <div className="aspect-[4/5] relative">
          <img
            src={opportunity.image_url || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400'}
            alt={opportunity.title}
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

          {/* Type Badge */}
          {opportunity.type && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-orange-600 text-white text-xs rounded-full">
              {opportunity.type}
            </div>
          )}

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
              {opportunity.title}
            </h3>
            {opportunity.organization && (
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <Building2 className="w-3 h-3" />
                {opportunity.organization}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

