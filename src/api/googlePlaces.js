/**
 * Google Places API Service
 * Handles all interactions with Google Maps Places API
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

/**
 * Get cache key for a request
 */
function getCacheKey(endpoint, params) {
  return `${endpoint}:${JSON.stringify(params)}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cached) {
  return Date.now() - cached.timestamp < CACHE_DURATION;
}

/**
 * Make request to Google Places API via proxy to avoid CORS
 */
async function makeRequest(endpoint, params) {
  if (!API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  // Use the Vercel serverless function proxy instead of direct API call
  const proxyUrl = new URL('/api/google-places', window.location.origin);
  proxyUrl.searchParams.append('endpoint', endpoint);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      proxyUrl.searchParams.append(key, value);
    }
  });

  console.log('🗺️ [GOOGLE PLACES] Making proxied request to:', proxyUrl.toString());

  const response = await fetch(proxyUrl.toString());
  if (!response.ok) {
    throw new Error(`Google Places API proxy error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
    return data;
  } else if (data.status === 'REQUEST_DENIED') {
    throw new Error(`Google Places API denied: ${data.error_message || 'Check API key and permissions'}`);
  } else if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Places API quota exceeded');
  } else if (data.status === 'INVALID_REQUEST') {
    throw new Error(`Invalid request: ${data.error_message || 'Check parameters'}`);
  } else {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }
}

/**
 * Text search for places
 * @param {string} query - Search query
 * @param {Object} location - { lat, lng } center point
 * @param {number} radius - Radius in meters (max 50000)
 * @returns {Promise<Array>} Array of place results
 */
export async function searchPlaces(query, location, radius = 5000) {
  console.log('🗺️ [GOOGLE PLACES] searchPlaces called:', { query, location, radius });
  
  if (!API_KEY) {
    console.warn('🗺️ [GOOGLE PLACES] API key not configured');
    return [];
  }

  const cacheKey = getCacheKey('textsearch', { query, location, radius });
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    console.log('🗺️ [GOOGLE PLACES] Using cached results:', cached.data.length);
    return cached.data;
  }

  try {
    const params = {
      query,
      radius: Math.min(radius, 50000), // Max 50km
    };

    if (location?.lat && location?.lng) {
      params.location = `${location.lat},${location.lng}`;
    }

    console.log('🗺️ [GOOGLE PLACES] Making API request with params:', params);
    const data = await makeRequest('textsearch', params);
    console.log('🗺️ [GOOGLE PLACES] API response status:', data.status, 'results:', data.results?.length || 0);
    
    const results = (data.results || []).map(formatPlaceResult);
    console.log('🗺️ [GOOGLE PLACES] Formatted results:', results.length, results.map(r => r.name));

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error) {
    console.error('🗺️ [GOOGLE PLACES] Error searching places:', error);
    return [];
  }
}

/**
 * Nearby search by category/type
 * @param {Object} location - { lat, lng } center point
 * @param {number} radius - Radius in meters (max 50000)
 * @param {string} type - Place type (e.g., 'bar', 'restaurant', 'cafe')
 * @returns {Promise<Array>} Array of place results
 */
export async function searchNearby(location, radius = 5000, type = null) {
  console.log('🗺️ [GOOGLE PLACES] searchNearby called:', { location, radius, type });
  
  if (!API_KEY) {
    console.warn('🗺️ [GOOGLE PLACES] API key not configured');
    return [];
  }

  if (!location?.lat || !location?.lng) {
    console.warn('🗺️ [GOOGLE PLACES] Invalid location provided');
    return [];
  }

  const cacheKey = getCacheKey('nearbysearch', { location, radius, type });
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    console.log('🗺️ [GOOGLE PLACES] Using cached nearby results:', cached.data.length);
    return cached.data;
  }

  try {
    const params = {
      location: `${location.lat},${location.lng}`,
      radius: Math.min(radius, 50000), // Max 50km
    };

    if (type) {
      params.type = type;
    }

    console.log('🗺️ [GOOGLE PLACES] Making nearby API request:', params);
    const data = await makeRequest('nearbysearch', params);
    console.log('🗺️ [GOOGLE PLACES] Nearby API response:', data.status, 'results:', data.results?.length || 0);
    
    const results = (data.results || []).map(formatPlaceResult);
    console.log('🗺️ [GOOGLE PLACES] Formatted nearby results:', results.length);

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error) {
    console.error('🗺️ [GOOGLE PLACES] Error searching nearby places:', error);
    return [];
  }
}

/**
 * Get detailed information about a place
 * @param {string} placeId - Google Places place_id
 * @returns {Promise<Object>} Place details
 */
export async function getPlaceDetails(placeId) {
  if (!API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  const cacheKey = getCacheKey('details', { placeId });
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,geometry,place_id,types,rating,user_ratings_total,photos,opening_hours,website,international_phone_number,price_level,business_status'
    };

    const data = await makeRequest('details', params);
    
    if (data.result) {
      const formatted = formatPlaceDetails(data.result);
      cache.set(cacheKey, { data: formatted, timestamp: Date.now() });
      return formatted;
    }

    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * Format place result from search
 */
function formatPlaceResult(result) {
  const location = result.geometry?.location;
  return {
    google_place_id: result.place_id,
    name: result.name,
    address: result.formatted_address || result.vicinity,
    latitude: location?.lat || null,
    longitude: location?.lng || null,
    rating: result.rating || null,
    user_ratings_total: result.user_ratings_total || 0,
    types: result.types || [],
    photo_reference: result.photos?.[0]?.photo_reference || null,
    raw_data: result // Store full result for reference
  };
}

/**
 * Format place details from details API
 */
function formatPlaceDetails(result) {
  const location = result.geometry?.location;
  return {
    google_place_id: result.place_id,
    name: result.name,
    address: result.formatted_address,
    latitude: location?.lat || null,
    longitude: location?.lng || null,
    rating: result.rating || null,
    user_ratings_total: result.user_ratings_total || 0,
    types: result.types || [],
    phone: result.international_phone_number || null,
    website: result.website || null,
    opening_hours: result.opening_hours || null,
    price_level: result.price_level || null,
    business_status: result.business_status || null,
    photos: result.photos || [],
    raw_data: result // Store full result for reference
  };
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles) {
  return miles * 1609.34;
}

/**
 * Map category to Google Places type
 */
export function categoryToGoogleType(category) {
  const typeMap = {
    'bars': 'bar',
    'restaurants': 'restaurant',
    'cafes': 'cafe',
    'gym': 'gym',
    'library': 'library',
    'study_spot': 'library',
    'entertainment': 'amusement_park',
    'shopping': 'shopping_mall'
  };

  return typeMap[category?.toLowerCase()] || null;
}

