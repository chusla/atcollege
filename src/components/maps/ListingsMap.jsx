import React, { useCallback, useState, useMemo } from 'react'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { Link } from 'react-router-dom'
import { createPageUrl } from '@/utils'
import { Calendar, MapPin, Star, Clock, Users } from 'lucide-react'

const containerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  lat: 42.3770, // Harvard University default
  lng: -71.1167
}

// Custom marker colors by type
const markerColors = {
  event: '#f97316', // orange
  place: '#3b82f6', // blue
  opportunity: '#22c55e', // green
  group: '#a855f7' // purple
}

export default function ListingsMap({ 
  items = [], 
  itemType = 'event',
  center = null,
  zoom = 13,
  onMarkerClick = null,
  showInfoWindow = true,
  height = '400px'
}) {
  const [selectedItem, setSelectedItem] = useState(null)
  const [map, setMap] = useState(null)

  // Filter items that have valid coordinates
  const itemsWithCoords = useMemo(() => {
    return items.filter(item => 
      item.latitude && item.longitude && 
      !isNaN(parseFloat(item.latitude)) && 
      !isNaN(parseFloat(item.longitude))
    )
  }, [items])

  // Calculate center from items or use provided center
  const mapCenter = useMemo(() => {
    if (center) return center
    
    if (itemsWithCoords.length > 0) {
      const avgLat = itemsWithCoords.reduce((sum, item) => sum + parseFloat(item.latitude), 0) / itemsWithCoords.length
      const avgLng = itemsWithCoords.reduce((sum, item) => sum + parseFloat(item.longitude), 0) / itemsWithCoords.length
      return { lat: avgLat, lng: avgLng }
    }
    
    return defaultCenter
  }, [center, itemsWithCoords])

  const onLoad = useCallback((map) => {
    setMap(map)
    
    // Fit bounds to show all markers
    if (itemsWithCoords.length > 1) {
      const bounds = new window.google.maps.LatLngBounds()
      itemsWithCoords.forEach(item => {
        bounds.extend({
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude)
        })
      })
      map.fitBounds(bounds, { padding: 50 })
    }
  }, [itemsWithCoords])

  const handleMarkerClick = (item) => {
    if (onMarkerClick) {
      onMarkerClick(item)
    }
    if (showInfoWindow) {
      setSelectedItem(item)
    }
  }

  const getItemUrl = (item) => {
    return createPageUrl('Detail') + `?type=${itemType}&id=${item.id}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Check if Google Maps is available
  if (!window.google) {
    return (
      <div 
        className="bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-gray-500">Map loading...</p>
      </div>
    )
  }

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
      >
        {itemsWithCoords.map((item) => (
          <Marker
            key={item.id}
            position={{
              lat: parseFloat(item.latitude),
              lng: parseFloat(item.longitude)
            }}
            onClick={() => handleMarkerClick(item)}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: markerColors[itemType] || markerColors.event,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
          />
        ))}

        {selectedItem && showInfoWindow && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedItem.latitude),
              lng: parseFloat(selectedItem.longitude)
            }}
            onCloseClick={() => setSelectedItem(null)}
          >
            <Link 
              to={getItemUrl(selectedItem)}
              className="block max-w-xs p-1"
            >
              {selectedItem.image_url && (
                <img 
                  src={selectedItem.image_url} 
                  alt={selectedItem.title || selectedItem.name}
                  className="w-full h-24 object-cover rounded mb-2"
                />
              )}
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {selectedItem.title || selectedItem.name}
              </h3>
              
              {itemType === 'event' && selectedItem.date && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(selectedItem.date)}</span>
                  {selectedItem.time && <span>• {selectedItem.time}</span>}
                </div>
              )}
              
              {(selectedItem.location || selectedItem.address) && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{selectedItem.location || selectedItem.address}</span>
                </div>
              )}
              
              {itemType === 'place' && selectedItem.rating && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{selectedItem.rating}</span>
                </div>
              )}

              {itemType === 'group' && selectedItem.member_count && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Users className="w-3 h-3" />
                  <span>{selectedItem.member_count} members</span>
                </div>
              )}
              
              <span className="text-xs text-orange-500 mt-2 block">
                View details →
              </span>
            </Link>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}

