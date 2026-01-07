import React, { useCallback, useState, useMemo } from 'react'
import { GoogleMap, OverlayView, InfoWindow } from '@react-google-maps/api'
import { Link } from 'react-router-dom'
import { createPageUrl } from '@/utils'
import { Calendar, MapPin, Star, Users } from 'lucide-react'

const containerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  lat: 42.3770,
  lng: -71.1167
}

const markerColors = {
  event: '#f97316',
  place: '#3b82f6',
  opportunity: '#22c55e',
  group: '#a855f7'
}

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

// Teardrop marker component - Yelp/Google style
function TeardropMarker({ item, itemType, isHovered, isSelected, onClick, onHover, onLeave }) {
  const color = markerColors[itemType] || markerColors.place;
  const hasImage = item.image_url;
  const name = item.title || item.name;
  
  return (
    <div 
      className="relative cursor-pointer"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ 
        transform: 'translate(-50%, -100%)',
        filter: isHovered || isSelected ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        zIndex: isHovered || isSelected ? 1000 : 1
      }}
    >
      {/* SVG Teardrop shape */}
      <svg 
        width={isHovered || isSelected ? "48" : "40"} 
        height={isHovered || isSelected ? "60" : "50"}
        viewBox="0 0 40 50" 
        className="transition-all duration-200 ease-out"
        style={{ overflow: 'visible' }}
      >
        {/* Teardrop path */}
        <defs>
          <clipPath id={`clip-${item.id}`}>
            <circle cx="20" cy="17" r="13" />
          </clipPath>
        </defs>
        
        {/* Main teardrop shape */}
        <path 
          d="M20 0 C8 0 0 8 0 18 C0 28 20 50 20 50 C20 50 40 28 40 18 C40 8 32 0 20 0 Z"
          fill={color}
        />
        
        {/* White inner circle */}
        <circle cx="20" cy="17" r="14" fill="white" />
        
        {/* Image or colored circle */}
        {hasImage ? (
          <image 
            href={item.image_url}
            x="7" y="4"
            width="26" height="26"
            clipPath={`url(#clip-${item.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <circle cx="20" cy="17" r="13" fill={`${color}20`} />
        )}
        
        {/* Inner border */}
        <circle 
          cx="20" cy="17" r="13" 
          fill="none" 
          stroke={color} 
          strokeWidth="2"
        />
      </svg>
      
      {/* Hover card - Yelp style */}
      {isHovered && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 animate-fade-in"
          style={{ minWidth: '180px', maxWidth: '220px', zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
            {/* Image preview */}
            {hasImage && (
              <div className="h-20 w-full overflow-hidden">
                <img 
                  src={item.image_url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="p-2.5">
              <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {name}
              </h4>
              
              {/* Rating */}
              {item.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-3 h-3 ${
                          star <= Math.round(item.rating) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {item.rating}
                    {item.google_place_data?.user_ratings_total && (
                      <span> ({item.google_place_data.user_ratings_total})</span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Category/Type badge */}
              {item.category && (
                <span 
                  className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {item.category}
                </span>
              )}
            </div>
          </div>
          
          {/* Arrow pointing down */}
          <div className="flex justify-center">
            <div 
              className="w-3 h-3 bg-white border-r border-b border-gray-100 -mt-1.5"
              style={{ transform: 'rotate(45deg)' }}
            />
          </div>
        </div>
      )}
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
  height = '500px'
}) {
  const effectiveZoom = zoom ?? (radiusMiles ? getZoomForRadius(radiusMiles) : 13);
  const [selectedItem, setSelectedItem] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [map, setMap] = useState(null)

  const itemsWithCoords = useMemo(() => {
    return items.filter(item => 
      item.latitude && item.longitude && 
      !isNaN(parseFloat(item.latitude)) && 
      !isNaN(parseFloat(item.longitude))
    )
  }, [items])

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
        {/* Teardrop markers */}
        {itemsWithCoords.map((item) => (
          <OverlayView
            key={item.id}
            position={{
              lat: parseFloat(item.latitude),
              lng: parseFloat(item.longitude)
            }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <TeardropMarker
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

        {/* Click info window */}
        {selectedItem && showInfoWindow && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedItem.latitude),
              lng: parseFloat(selectedItem.longitude)
            }}
            onCloseClick={() => setSelectedItem(null)}
            options={{
              pixelOffset: new window.google.maps.Size(0, -50)
            }}
          >
            <Link 
              to={getItemUrl(selectedItem)}
              className="block w-56"
            >
              {selectedItem.image_url && (
                <img 
                  src={selectedItem.image_url} 
                  alt={selectedItem.title || selectedItem.name}
                  className="w-full h-32 object-cover rounded-lg mb-2"
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
                <div className="flex items-center gap-1 text-xs mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-3 h-3 ${
                          star <= Math.round(selectedItem.rating) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-500">{selectedItem.rating}</span>
                </div>
              )}

              {itemType === 'group' && selectedItem.member_count && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Users className="w-3 h-3" />
                  <span>{selectedItem.member_count} members</span>
                </div>
              )}
              
              <div 
                className="text-xs mt-2 font-medium py-1.5 px-3 rounded-full text-center text-white"
                style={{ backgroundColor: markerColors[itemType] }}
              >
                View Details
              </div>
            </Link>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
