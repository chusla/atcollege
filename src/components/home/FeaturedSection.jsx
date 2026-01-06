import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeaturedSection({ title, viewAllLink, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {viewAllLink && (
          <Link
            to={createPageUrl(viewAllLink)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        {children}
      </div>
    </motion.section>
  );
}

