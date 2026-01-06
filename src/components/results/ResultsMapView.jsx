import React from 'react';
import { Card } from '@/components/ui/card';
import ListingsMap from '@/components/maps/ListingsMap';

export default function ResultsMapView({ items, itemType, center = null, radiusMiles = null }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  
  // Show placeholder if no API key or no items with coordinates
  const itemsWithCoords = items.filter(item => item.latitude && item.longitude)
  
  if (!apiKey) {
    return (
      <Card className="mb-6 overflow-hidden">
        <div className="h-96 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-2">Map View</p>
            <p className="text-sm text-gray-400">
              Google Maps API key not configured
            </p>
          </div>
        </div>
      </Card>
    );
  }
  
  if (itemsWithCoords.length === 0) {
    return (
      <Card className="mb-6 overflow-hidden">
        <div className="h-96 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-2">Map View</p>
            <p className="text-sm text-gray-400">
              No {itemType}s with location data
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <ListingsMap 
        items={items} 
        itemType={itemType} 
        center={center}
        radiusMiles={radiusMiles}
        height="384px"
      />
    </Card>
  );
}

