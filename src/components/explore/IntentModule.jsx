import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, MapPin, Calendar, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IntentModule({
  title,
  prompt,
  categories,
  showTimeWindow,
  showRadius,
  onSubmit,
  previewImage,
  previewTitle,
  previewSubtitle,
  initialTimeWindow,
  initialRadius
}) {
  const [category, setCategory] = useState('all');
  const [timeWindow, setTimeWindow] = useState(initialTimeWindow || '1month');
  const [radius, setRadius] = useState(initialRadius || '5');

  const handleSubmit = () => {
    onSubmit({ category, timeWindow, radius });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Preview Card */}
        <div className="hidden lg:block lg:w-48 flex-shrink-0">
          <div className="aspect-[4/5] rounded-xl overflow-hidden relative">
            <img
              src={previewImage}
              alt={previewTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <h4 className="text-white font-semibold text-sm">{previewTitle}</h4>
              <p className="text-white/80 text-xs">{previewSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{prompt}</p>

          <div className="flex flex-wrap gap-3 mb-4">
            {/* Category */}
            <div className="w-full sm:w-auto flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Window */}
            {showTimeWindow && (
              <div className="w-full sm:w-auto flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <Select value={timeWindow} onValueChange={setTimeWindow}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="1week">This week</SelectItem>
                    <SelectItem value="2weeks">2 weeks</SelectItem>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="3months">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Radius */}
            {showRadius && (
              <div className="w-full sm:w-auto flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="2">2 miles</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="20">20 miles</SelectItem>
                    <SelectItem value="any">Any distance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 rounded-full px-6"
          >
            Submit
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

