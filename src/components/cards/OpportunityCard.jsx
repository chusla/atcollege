import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Briefcase, Building2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1.5 drop-shadow-sm">
              {opportunity.title}
            </h3>
            <div className="flex flex-col gap-1 text-white/90 text-xs font-medium">
              {opportunity.organization && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-white/80" />
                  <span className="truncate drop-shadow-sm">{opportunity.organization}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-white/80" />
                <span className="truncate drop-shadow-sm">
                  {opportunity.deadline
                    ? `Deadline: ${format(new Date(opportunity.deadline), 'MMM d, yyyy')}`
                    : 'No deadline'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

