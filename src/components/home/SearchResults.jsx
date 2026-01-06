import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, Briefcase, Users, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SearchResults({ results, query, loading }) {
  if (loading) {
    return (
      <div className="space-y-6 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const totalResults = results.eventsCount + results.placesCount + results.opportunitiesCount + results.groupsCount;

  if (totalResults === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 mb-10"
      >
        <p className="text-gray-500">No results found for "{query}"</p>
      </motion.div>
    );
  }

  const ResultSection = ({ title, icon: Icon, items, type, count, linkPage }) => {
    if (items.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className="text-sm text-gray-500">({count})</span>
          </div>
          {count > 5 && (
            <Link
              to={`${createPageUrl(linkPage)}?search=${encodeURIComponent(query)}`}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`${createPageUrl('Detail')}?type=${type}&id=${item.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=100'}
                alt={item.title || item.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">{item.title || item.name}</h4>
                  {item.status === 'pending' && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{item.description || item.category || item.type}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <p className="text-sm text-gray-500 mb-4">{totalResults} results for "{query}"</p>
      
      <ResultSection
        title="Events"
        icon={Calendar}
        items={results.events}
        type="event"
        count={results.eventsCount}
        linkPage="Events"
      />
      <ResultSection
        title="Places"
        icon={Building2}
        items={results.places}
        type="place"
        count={results.placesCount}
        linkPage="Places"
      />
      <ResultSection
        title="Opportunities"
        icon={Briefcase}
        items={results.opportunities}
        type="opportunity"
        count={results.opportunitiesCount}
        linkPage="Opportunities"
      />
      <ResultSection
        title="Groups"
        icon={Users}
        items={results.groups}
        type="group"
        count={results.groupsCount}
        linkPage="Groups"
      />
    </motion.div>
  );
}

