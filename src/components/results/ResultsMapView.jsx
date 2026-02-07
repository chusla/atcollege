import React from 'react';
import { Card } from '@/components/ui/card';
import ListingsMap from '@/components/maps/ListingsMap';
import { useGoogleMaps } from '@/components/maps/GoogleMapsProvider';

export default function ResultsMapView({ items, itemType, center = null, radiusMiles = null }) {
  const { isLoaded, loadError } = useGoogleMaps();
  
  // Show placeholder if no API key or no items with coordinates
  const itemsWithCoords = items.filter(item => item.latitude && item.longitude)
  
  if (!isLoaded) {
    return (
      <Card className="mb-6 overflow-hidden">
        <div className="h-[500px] bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            {loadError ? (
              <>
                <p className="text-gray-500 mb-2">Map View</p>
                <p className="text-sm text-gray-400">Map failed to load</p>
              </>
            ) : (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            )}
          </div>
        </div>
      </Card>
    );
  }
  
  if (itemsWithCoords.length === 0) {
    return (
      <Card className="mb-6 overflow-hidden">
        <div className="h-[500px] bg-gray-100 flex items-center justify-center">
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
        height="500px"
      />
    </Card>
  );
}
