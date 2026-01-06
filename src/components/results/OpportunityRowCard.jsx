import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Building2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function OpportunityRowCard({ opportunity, onSave, isSaved }) {
  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(opportunity);
  };

  return (
    <Link
      to={`${createPageUrl('Detail')}?type=opportunity&id=${opportunity.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <img
            src={opportunity.image_url || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200'}
            alt={opportunity.title}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{opportunity.title}</h3>
                {opportunity.type && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs">{opportunity.type}</Badge>
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
              {opportunity.organization && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {opportunity.organization}
                </div>
              )}
              {opportunity.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Deadline: {format(new Date(opportunity.deadline), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

