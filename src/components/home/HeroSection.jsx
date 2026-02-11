import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920';
const DEFAULT_HERO_TITLE = 'Social Life in and Around Campus';
const DEFAULT_HERO_SUBTITLE = 'Discover events, places, opportunities, and groups near your university';
const DEFAULT_HERO_PRE_TITLE = 'Your College Experience Starts Here';
const DEFAULT_TAGLINE_BAR = 'atCollege is a real-time network about social life in and around campus ...';

export default function HeroSection({ onJoin, stats = {}, heroTitle, heroSubtitle, heroImageUrl, heroPreTitle, taglineBar, isAuthenticated = false }) {
  const heroImage = heroImageUrl || DEFAULT_HERO_IMAGE;
  const { campusCount = 0, eventCount = 0, placeCount = 0, groupCount = 0 } = stats;

  return (
    <section className="relative flex flex-col overflow-hidden">
      {/* Background Image with Blue Overlay */}
      <div className="relative min-h-[50vh] md:min-h-[60vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Campus"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = DEFAULT_HERO_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-blue-900/70" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/90 text-sm sm:text-base mb-2">
              {heroPreTitle || DEFAULT_HERO_PRE_TITLE}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              {heroTitle || DEFAULT_HERO_TITLE}
            </h1>
            <p className="text-white/80 text-sm sm:text-base mb-8 max-w-2xl mx-auto">
              {heroSubtitle || DEFAULT_HERO_SUBTITLE}
            </p>
            <Button
              onClick={onJoin}
              className="bg-orange-500 hover:bg-orange-600 text-white text-base px-8 py-5 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {isAuthenticated ? 'Go to my Personal Page' : 'Get Started'}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-gray-900 py-6"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-white">{campusCount}+</span>
              <span className="text-white/70 text-xs sm:text-sm">Universities</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-white">{eventCount}+</span>
              <span className="text-white/70 text-xs sm:text-sm">Events</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-white">{placeCount}+</span>
              <span className="text-white/70 text-xs sm:text-sm">Places</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-white">{groupCount}+</span>
              <span className="text-white/70 text-xs sm:text-sm">Groups</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tagline Bar */}
      <div className="bg-gray-800 py-4 text-center">
        <p className="text-white/80 text-sm sm:text-base max-w-3xl mx-auto px-4">
          {taglineBar || DEFAULT_TAGLINE_BAR}
        </p>
      </div>
    </section>
  );
}

