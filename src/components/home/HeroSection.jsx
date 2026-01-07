import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function HeroSection({ onJoin, onExplore }) {
  return (
    <div className="relative min-h-[500px] sm:min-h-[550px] md:min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920"
          alt="Campus"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/70 to-blue-900/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Discover Your
            <span className="text-orange-400"> Campus Life</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto px-4">
            Find events, places, opportunities, and connect with students who share your interests. 
            Your college experience starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onJoin}
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 rounded-full"
            >
              Get Started
            </Button>
            <Button
              onClick={onExplore}
              size="lg"
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/10 text-lg px-8 py-6 rounded-full"
            >
              Explore Events
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 sm:mt-12 md:mt-16 grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-lg mx-auto px-4"
        >
          {[
            { number: '100+', label: 'Events' },
            { number: '50+', label: 'Places' },
            { number: '20+', label: 'Groups' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">{stat.number}</div>
              <div className="text-white/60 text-xs sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

