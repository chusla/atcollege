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

  // Try both VITE_ prefixed and non-prefixed env vars
  const API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error('Google Maps API key not configured');
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
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log the response status
    console.log('🗺️ [PROXY] Google Places API response:', data.status);

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

