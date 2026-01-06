import React, { useCallback, useState, useMemo, useEffect } from 'react'
import { GoogleMap, OverlayView, InfoWindow } from '@react-google-maps/api'
import { Link } from 'react-router-dom'
import { createPageUrl } from '@/utils'
import { Calendar, MapPin, Star, Users, Utensils, Music, ShoppingBag } from 'lucide-react'

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

// Calculate appropriate zoom level based on radius in miles
const getZoomForRadius = (radiusMiles) => {
  if (!radiusMiles || radiusMiles === 'all') return 12;
  const r = parseFloat(radiusMiles);
  if (r <= 0.5) return 16;
  if (r <= 1) return 15;
  if (r <= 2) return 14;
  if (r <= 3) return 13;
  if (r <= 5) return 12;
  if (r <= 10) return 11;
  if (r <= 25) return 10;
  return 9;
}

// Custom marker component with circular image
function CustomMarker({ item, itemType, isHovered, isSelected, onClick, onHover, onLeave }) {
  const color = markerColors[itemType] || markerColors.event;
  const hasImage = item.image_url;
  const name = item.title || item.name;
  
  // Get category icon
  const getCategoryIcon = () => {
    const category = item.category?.toLowerCase() || '';
    if (category.includes('food') || category.includes('restaurant')) return Utensils;
    if (category.includes('entertainment') || category.includes('music')) return Music;
    if (category.includes('shopping')) return ShoppingBag;
    return MapPin;
  };
  
  const IconComponent = getCategoryIcon();
  
  return (
    <div 
      className="relative cursor-pointer group"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      {/* Main marker - circular with image or icon */}
      <div 
        className={`
          relative transition-all duration-200 ease-out
          ${isHovered || isSelected ? 'scale-125 z-50' : 'scale-100 z-10'}
        `}
      >
        {/* Outer ring */}
        <div 
          className={`
            rounded-full p-0.5 shadow-lg
            ${isHovered || isSelected ? 'ring-2 ring-white shadow-xl' : ''}
          `}
          style={{ backgroundColor: color }}
        >
          {/* Inner circle with image or icon */}
          <div 
            className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center"
            style={{ 
              border: `2px solid ${color}`,
            }}
          >
            {hasImage ? (
              <img 
                src={item.image_url} 
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full items-center justify-center ${hasImage ? 'hidden' : 'flex'}`}
              style={{ backgroundColor: `${color}15` }}
            >
              <IconComponent className="w-5 h-5" style={{ color }} />
            </div>
          </div>
        </div>
        
        {/* Pointer triangle */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `8px solid ${color}`,
          }}
        />
      </div>
      
      {/* Hover tooltip with name */}
      <div 
        className={`
          absolute left-1/2 -translate-x-1/2 bottom-full mb-2
          bg-gray-900 text-white text-xs font-medium
          px-2.5 py-1.5 rounded-lg whitespace-nowrap
          shadow-lg pointer-events-none
          transition-all duration-200
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
        `}
        style={{ maxWidth: '200px' }}
      >
        <span className="block truncate">{name}</span>
        {item.rating && (
          <span className="flex items-center gap-1 mt-0.5 text-yellow-400">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-white">{item.rating}</span>
          </span>
        )}
        {/* Tooltip arrow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
          style={{
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #111827',
          }}
        />
      </div>
    </div>
  )
}

export default function ListingsMap({ 
  items = [], 
  itemType = 'event',
  center = null,
  zoom = null,
  radiusMiles = null,
  onMarkerClick = null,
  showInfoWindow = true,
  height = '400px'
}) {
  const effectiveZoom = zoom ?? (radiusMiles ? getZoomForRadius(radiusMiles) : 13);
  const [selectedItem, setSelectedItem] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)
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
    
    if (!center && itemsWithCoords.length > 1) {
      const bounds = new window.google.maps.LatLngBounds()
      itemsWithCoords.forEach(item => {
        bounds.extend({
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude)
        })
      })
      map.fitBounds(bounds, { padding: 50 })
    }
  }, [center, itemsWithCoords])

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
        zoom={effectiveZoom}
        onLoad={onLoad}
        onClick={() => setSelectedItem(null)}
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
        {/* Custom markers with images */}
        {itemsWithCoords.map((item) => (
          <OverlayView
            key={item.id}
            position={{
              lat: parseFloat(item.latitude),
              lng: parseFloat(item.longitude)
            }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <CustomMarker
              item={item}
              itemType={itemType}
              isHovered={hoveredItem?.id === item.id}
              isSelected={selectedItem?.id === item.id}
              onClick={() => handleMarkerClick(item)}
              onHover={() => setHoveredItem(item)}
              onLeave={() => setHoveredItem(null)}
            />
          </OverlayView>
        ))}

        {/* Info window on click */}
        {selectedItem && showInfoWindow && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedItem.latitude),
              lng: parseFloat(selectedItem.longitude)
            }}
            onCloseClick={() => setSelectedItem(null)}
            options={{
              pixelOffset: new window.google.maps.Size(0, -45)
            }}
          >
            <Link 
              to={getItemUrl(selectedItem)}
              className="block max-w-xs p-1"
            >
              {selectedItem.image_url && (
                <img 
                  src={selectedItem.image_url} 
                  alt={selectedItem.title || selectedItem.name}
                  className="w-full h-28 object-cover rounded-lg mb-2"
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
                  {selectedItem.google_place_data?.user_ratings_total && (
                    <span className="text-gray-400">
                      ({selectedItem.google_place_data.user_ratings_total})
                    </span>
                  )}
                </div>
              )}

              {itemType === 'group' && selectedItem.member_count && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Users className="w-3 h-3" />
                  <span>{selectedItem.member_count} members</span>
                </div>
              )}
              
              <span className="text-xs text-orange-500 mt-2 block font-medium">
                View details →
              </span>
            </Link>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
