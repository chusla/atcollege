import React from 'react';
import { Card } from '@/components/ui/card';

export default function ResultsMapView({ items, itemType }) {
  // Placeholder map component - would integrate with Leaflet or Mapbox
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="h-96 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Map View</p>
          <p className="text-sm text-gray-400">
            {items.length} {itemType}s with location data
          </p>
        </div>
      </div>
    </Card>
  );
}

