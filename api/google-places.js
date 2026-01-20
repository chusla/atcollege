/**
 * Vercel Serverless Function to proxy Google Places API requests
 * This avoids CORS issues and keeps the API key server-side
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // New API uses POST, legacy uses GET
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get endpoint from query or body (new API uses POST)
  const endpoint = req.query.endpoint || req.body?.endpoint;
  const queryParams = req.method === 'POST' && req.body ? req.body : req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }
  
  // Remove endpoint from params
  delete queryParams.endpoint;

  // Use server-side environment variable (VITE_ vars are client-side only)
  // In Vercel, set GOOGLE_MAPS_API_KEY in environment variables
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error('Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in Vercel environment variables.');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    let url, headers, method = 'GET', body = null;
    
    // Use new Places API (New) format
    if (endpoint === 'textsearch') {
      // Text Search (New)
      url = new URL('https://places.googleapis.com/v1/places:searchText');
      headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos,places.editorialSummary'
      };
      method = 'POST';
      body = JSON.stringify({
        textQuery: queryParams.query,
        maxResultCount: 20,
        locationBias: queryParams.location ? {
          circle: {
            center: {
              latitude: parseFloat(queryParams.location.split(',')[0]),
              longitude: parseFloat(queryParams.location.split(',')[1])
            },
            radius: parseFloat(queryParams.radius || 5000)
          }
        } : undefined
      });
    } else if (endpoint === 'nearbysearch') {
      // Nearby Search (New)
      url = new URL('https://places.googleapis.com/v1/places:searchNearby');
      headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos,places.editorialSummary'
      };
      method = 'POST';
      const [lat, lng] = queryParams.location.split(',');
      body = JSON.stringify({
        includedTypes: queryParams.type ? [queryParams.type] : undefined,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng)
            },
            radius: parseFloat(queryParams.radius || 5000)
          }
        }
      });
    } else if (endpoint === 'details') {
      // Place Details (New) - place_id might be just the ID or full format
      if (!queryParams.place_id) {
        throw new Error('Missing place_id parameter for details endpoint');
      }
      const placeId = queryParams.place_id.startsWith('places/') 
        ? queryParams.place_id 
        : `places/${queryParams.place_id}`;
      url = new URL(`https://places.googleapis.com/v1/${placeId}`);
      headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,types,photos,editorialSummary,internationalPhoneNumber,websiteUri,regularOpeningHours,priceLevel,businessStatus,reviews'
      };
      method = 'GET';
      // No body needed for GET request
    } else if (endpoint === 'autocomplete') {
      // Autocomplete (New) - for searching universities/colleges
      url = new URL('https://places.googleapis.com/v1/places:autocomplete');
      headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      };
      method = 'POST';
      body = JSON.stringify({
        input: queryParams.input,
        includedPrimaryTypes: queryParams.types ? queryParams.types.split(',') : undefined,
        // includedRegionCodes: ['us'] // Uncomment to limit to US only
      });
    } else if (endpoint === 'university-search') {
      // Special endpoint for university/college search
      url = new URL('https://places.googleapis.com/v1/places:searchText');
      headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.photos'
      };
      method = 'POST';
      // Add "university" or "college" to the query if not present
      let searchQuery = queryParams.query;
      if (!searchQuery.toLowerCase().includes('university') && !searchQuery.toLowerCase().includes('college')) {
        searchQuery = `${searchQuery} university`;
      }
      body = JSON.stringify({
        textQuery: searchQuery,
        includedType: 'university', // Only return universities
        maxResultCount: 10
      });
    } else {
      // Fallback to legacy API for other endpoints
      url = new URL(`https://maps.googleapis.com/maps/api/place/${endpoint}/json`);
      url.searchParams.append('key', API_KEY);
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });
      headers = {
        'User-Agent': 'atcollege-serverless-function/1.0',
        'Referer': req.headers.referer || req.headers.origin || 'https://atcollege.vercel.app'
      };
    }

    console.log('🗺️ [PROXY] Fetching from Google Places API:', url.toString(), method);

    // Make the request to Google Places API
    const response = await fetch(url.toString(), {
      method,
      headers,
      body
    });
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle new API format responses
    if (endpoint === 'textsearch' || endpoint === 'nearbysearch' || endpoint === 'details') {
      // New API format - return as-is (already in correct format)
      console.log('🗺️ [PROXY] New API response received');
      return res.status(200).json(data);
    }
    
    // Legacy API format handling
    console.log('🗺️ [PROXY] Google Places API response:', data.status);
    
    // Check for API key restriction errors
    if (data.status === 'REQUEST_DENIED' && data.error_message?.includes('referer restrictions')) {
      console.error('🗺️ [PROXY] API key has referer restrictions. Update key in Google Cloud Console to use IP restrictions or None instead.');
      return res.status(403).json({ 
        error: 'API key configuration error',
        message: 'API keys with referer restrictions cannot be used server-side. Please update your API key in Google Cloud Console to use IP address restrictions or no restrictions.',
        details: data.error_message
      });
    }

    // Return the data to the client
    return res.status(200).json(data);
  } catch (error) {
    console.error('🗺️ [PROXY] Error proxying Google Places API:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch from Google Places API',
      message: error.message 
    });
  }
}

