/** Default radius in miles for listing pages (Events, Places, Opportunities) to limit results */
export const DEFAULT_RADIUS_MILES = 5;
/** Radius in miles when user explicitly selects "Any distance" */
export const ANY_DISTANCE_RADIUS_MILES = 50;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Filter items by distance from a center point
 * @param {Array} items - Array of items with latitude/longitude properties
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radiusMiles - Radius in miles
 * @returns {Array} Filtered items with distance property added
 */
export function filterByRadius(items, centerLat, centerLng, radiusMiles) {
  return items
    .map(item => {
      if (!item.latitude || !item.longitude) return null
      
      const distance = calculateDistance(
        centerLat, centerLng,
        parseFloat(item.latitude), parseFloat(item.longitude)
      )
      
      if (distance <= radiusMiles) {
        return { ...item, distance: Math.round(distance * 10) / 10 }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Get bounding box for a center point and radius
 * Used for initial database query filtering
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusMiles - Radius in miles
 * @returns {Object} { minLat, maxLat, minLng, maxLng }
 */
export function getBoundingBox(lat, lng, radiusMiles) {
  // Approximate degrees per mile at this latitude
  const latDegPerMile = 1 / 69
  const lngDegPerMile = 1 / (69 * Math.cos(toRad(lat)))
  
  const latOffset = radiusMiles * latDegPerMile
  const lngOffset = radiusMiles * lngDegPerMile
  
  return {
    minLat: lat - latOffset,
    maxLat: lat + latOffset,
    minLng: lng - lngOffset,
    maxLng: lng + lngOffset
  }
}

/**
 * Format distance for display
 * @param {number} miles - Distance in miles
 * @returns {string} Formatted distance string
 */
export function formatDistance(miles) {
  if (miles < 0.1) return 'Nearby'
  if (miles < 1) return `${Math.round(miles * 10) / 10} mi`
  return `${Math.round(miles * 10) / 10} mi`
}

