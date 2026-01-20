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
 * New API uses POST, legacy uses GET - proxy handles the conversion
 */
async function makeRequest(endpoint, params) {
  if (!API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  // Use the Vercel serverless function proxy instead of direct API call
  const proxyUrl = new URL('/api/google-places', window.location.origin);
  proxyUrl.searchParams.append('endpoint', endpoint);
  
  // Add all params as query params - proxy will convert to POST body for new API
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      proxyUrl.searchParams.append(key, value);
    }
  });

  console.log('🗺️ [GOOGLE PLACES] Making proxied request to:', proxyUrl.toString());

  const response = await fetch(proxyUrl.toString());
  if (!response.ok) {
    const errorText = await response.text();
    console.error('🗺️ [GOOGLE PLACES] Proxy error response:', errorText);
    throw new Error(`Google Places API proxy error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // New API doesn't use status field - check for error field instead
  if (data.error) {
    throw new Error(`Google Places API error: ${data.error.message || JSON.stringify(data.error)}`);
  }
  
  // Legacy API status handling
  if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
    return data;
  } else if (data.status === 'REQUEST_DENIED') {
    throw new Error(`Google Places API denied: ${data.error_message || 'Check API key and permissions'}`);
  } else if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Places API quota exceeded');
  } else if (data.status === 'INVALID_REQUEST') {
    throw new Error(`Invalid request: ${data.error_message || 'Check parameters'}`);
  } else if (data.status) {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }
  
  // New API format - return as-is
  return data;
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
    
    // Handle new API format (places array) or legacy format (results array)
    const places = data.places || data.results || [];
    console.log('🗺️ [GOOGLE PLACES] API response - places:', places.length, 'status:', data.status);
    
    const results = places.map(formatPlaceResult);
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
    
    // Handle new API format (places array) or legacy format (results array)
    const places = data.places || data.results || [];
    console.log('🗺️ [GOOGLE PLACES] Nearby API response - places:', places.length, 'status:', data.status);
    
    const results = places.map(formatPlaceResult);
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
    // New API uses place_id in URL path, no fields parameter needed (proxy sets X-Goog-FieldMask header)
    const params = {
      place_id: placeId
    };

    console.log('🗺️ [PLACE DETAILS] Fetching details for place_id:', placeId);
    const data = await makeRequest('details', params);
    
    // Handle new API format (direct object) or legacy format (result object)
    const placeData = data.id ? data : data.result;
    
    if (placeData) {
      // Log raw photos data to debug
      console.log('🗺️ [PLACE DETAILS] Raw photos data:', {
        hasPhotosArray: !!placeData.photos,
        photoCount: placeData.photos?.length || 0,
        firstPhoto: placeData.photos?.[0] ? {
          hasName: !!placeData.photos[0].name, // New API uses 'name'
          hasReference: !!placeData.photos[0].photo_reference, // Legacy uses 'photo_reference'
          name: placeData.photos[0].name?.substring(0, 50) + '...',
          reference: placeData.photos[0].photo_reference?.substring(0, 50) + '...',
          widthPx: placeData.photos[0].widthPx || placeData.photos[0].width,
          heightPx: placeData.photos[0].heightPx || placeData.photos[0].height
        } : null
      });
      
      const formatted = formatPlaceDetails(placeData);
      console.log('🗺️ [PLACE DETAILS] Formatted result:', {
        name: formatted.name,
        hasPhotos: formatted.photos?.length > 0,
        photoCount: formatted.photos?.length || 0,
        hasPhotoReference: !!formatted.photo_reference,
        hasPhotoName: !!formatted.photo_name,
        hasPhotoUrl: !!formatted.photo_url,
        photoUrl: formatted.photo_url?.substring(0, 100) + '...',
        hasEditorialSummary: !!formatted.editorials_summary
      });
      cache.set(cacheKey, { data: formatted, timestamp: Date.now() });
      return formatted;
    }

    console.warn('🗺️ [PLACE DETAILS] No result returned for place_id:', placeId);
    return null;
  } catch (error) {
    console.error('🗺️ [PLACE DETAILS] Error getting place details:', error);
    return null;
  }
}

/**
 * Get photo URL from Google Places photo reference (Legacy API)
 * @param {string} photoReference - Photo reference from Google Places
 * @param {number} maxWidth - Maximum width in pixels (default 400)
 * @returns {string} Photo URL
 */
export function getPhotoUrl(photoReference, maxWidth = 400) {
  if (!photoReference || !API_KEY) {
    return null;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
}

/**
 * Get photo URL from Google Places photo name (New API)
 * @param {string} photoName - Photo name from Places API (New) in format places/PLACE_ID/photos/PHOTO_RESOURCE
 * @param {number} maxWidth - Maximum width in pixels (default 400)
 * @returns {string} Photo URL
 */
export function getPhotoUrlFromName(photoName, maxWidth = 400) {
  if (!photoName || !API_KEY) {
    return null;
  }
  // New API format: https://places.googleapis.com/v1/NAME/media?maxHeightPx=400&maxWidthPx=400&key=API_KEY
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxWidth}&key=${API_KEY}`;
}

/**
 * Format place result from search
 * Handles both new API format and legacy format
 */
function formatPlaceResult(result) {
  // New API format uses different field names
  const placeId = result.id || result.place_id;
  const name = result.displayName?.text || result.name;
  const address = result.formattedAddress || result.formatted_address || result.vicinity;
  const location = result.location || result.geometry?.location;
  const lat = location?.latitude || location?.lat;
  const lng = location?.longitude || location?.lng;
  
  // Photos: New API uses 'name', legacy uses 'photo_reference'
  const firstPhoto = result.photos?.[0];
  const photoName = firstPhoto?.name; // New API format
  const photoRef = firstPhoto?.photo_reference; // Legacy format
  
  // Generate photo URL - new API needs different handling
  let photoUrl = null;
  if (photoName) {
    // New API: Use photo name to construct URL
    photoUrl = getPhotoUrlFromName(photoName, 800);
    console.log('📸 [FORMAT] New API photo:', { photoName: photoName.substring(0, 50) + '...', photoUrl: photoUrl?.substring(0, 100) + '...' });
  } else if (photoRef) {
    // Legacy API: Use photo reference
    photoUrl = getPhotoUrl(photoRef, 800);
    console.log('📸 [FORMAT] Legacy API photo:', { photoRef: photoRef.substring(0, 50) + '...', photoUrl: photoUrl?.substring(0, 100) + '...' });
  } else {
    console.warn('📸 [FORMAT] No photo found in result:', { hasPhotos: !!result.photos, photoCount: result.photos?.length || 0 });
  }
  
  return {
    google_place_id: placeId,
    name: name,
    address: address,
    latitude: lat || null,
    longitude: lng || null,
    rating: result.rating || null,
    user_ratings_total: result.userRatingCount || result.user_ratings_total || 0,
    types: result.types || [],
    photo_reference: photoRef || null,
    photo_name: photoName || null, // New API format
    photo_url: photoUrl,
    raw_data: result // Store full result for reference
  };
}

/**
 * Format place details from details API
 */
/**
 * Format place details from details API
 * Handles both new API format and legacy format
 */
function formatPlaceDetails(result) {
  // New API format uses different field names
  const placeId = result.id || result.place_id;
  const name = result.displayName?.text || result.name;
  const address = result.formattedAddress || result.formatted_address;
  const location = result.location || result.geometry?.location;
  const lat = location?.latitude || location?.lat;
  const lng = location?.longitude || location?.lng;
  
  // Photos: New API uses 'name', legacy uses 'photo_reference'
  const firstPhoto = result.photos?.[0];
  const photoName = firstPhoto?.name; // New API format
  const photoRef = firstPhoto?.photo_reference; // Legacy format
  
  // Generate photo URL
  let photoUrl = null;
  if (photoName) {
    photoUrl = getPhotoUrlFromName(photoName, 800);
    console.log('📸 [DETAILS] New API photo:', { photoName: photoName.substring(0, 50) + '...', photoUrl: photoUrl?.substring(0, 100) + '...' });
  } else if (photoRef) {
    photoUrl = getPhotoUrl(photoRef, 800);
    console.log('📸 [DETAILS] Legacy API photo:', { photoRef: photoRef.substring(0, 50) + '...', photoUrl: photoUrl?.substring(0, 100) + '...' });
  } else {
    console.warn('📸 [DETAILS] No photo found:', { hasPhotos: !!result.photos, photoCount: result.photos?.length || 0 });
  }
  
  // Editorial summary: New API uses editorialSummary, legacy uses editorial_summary
  const editorialSummary = result.editorialSummary?.text || result.editorial_summary?.overview || null;
  
  return {
    google_place_id: placeId,
    name: name,
    address: address,
    latitude: lat || null,
    longitude: lng || null,
    rating: result.rating || null,
    user_ratings_total: result.userRatingCount || result.user_ratings_total || 0,
    types: result.types || [],
    phone: result.internationalPhoneNumber || result.international_phone_number || null,
    website: result.websiteUri || result.website || null,
    opening_hours: result.regularOpeningHours || result.opening_hours || null,
    price_level: result.priceLevel || result.price_level || null,
    business_status: result.businessStatus || result.business_status || null,
    photos: result.photos || [],
    photo_reference: photoRef || null,
    photo_name: photoName || null, // New API format
    photo_url: photoUrl,
    editorials_summary: editorialSummary, // Plain English description
    raw_data: result // Store full result for reference
  };
}

/**
 * Search for universities/colleges
 * @param {string} query - Search query (e.g., "tufts")
 * @returns {Promise<Array>} Array of university results
 */
export async function searchUniversities(query) {
  if (!query || query.length < 2) {
    return [];
  }

  const cacheKey = getCacheKey('university-search', { query });
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  try {
    console.log('🎓 [UNIVERSITY SEARCH] Searching for:', query);
    const data = await makeRequest('university-search', { query });
    
    const places = data.places || [];
    console.log('🎓 [UNIVERSITY SEARCH] Found:', places.length, 'results');
    
    const results = places.map(result => {
      const placeId = result.id;
      const name = result.displayName?.text || result.name;
      const address = result.formattedAddress;
      const location = result.location;
      const lat = location?.latitude;
      const lng = location?.longitude;
      
      // Get photo URL if available
      const firstPhoto = result.photos?.[0];
      const photoName = firstPhoto?.name;
      const photoUrl = photoName ? getPhotoUrlFromName(photoName, 400) : null;
      
      return {
        google_place_id: placeId,
        name,
        address,
        latitude: lat,
        longitude: lng,
        types: result.types || [],
        photo_url: photoUrl
      };
    });

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error) {
    console.error('🎓 [UNIVERSITY SEARCH] Error:', error);
    return [];
  }
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

