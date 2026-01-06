/**
 * Vercel Serverless Function to proxy Google Places API requests
 * This avoids CORS issues and keeps the API key server-side
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, ...queryParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  // Use server-side environment variable (VITE_ vars are client-side only)
  // In Vercel, set GOOGLE_MAPS_API_KEY in environment variables
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error('Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in Vercel environment variables.');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Build the Google Places API URL
    const url = new URL(`https://maps.googleapis.com/maps/api/place/${endpoint}/json`);
    url.searchParams.append('key', API_KEY);
    
    // Add all query parameters from the request
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    console.log('🗺️ [PROXY] Fetching from Google Places API:', url.toString());

    // Make the request to Google Places API
    // Include User-Agent to help with API key restrictions
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'atcollege-serverless-function/1.0',
        'Referer': req.headers.referer || req.headers.origin || 'https://atcollege.vercel.app'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log the response status
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

