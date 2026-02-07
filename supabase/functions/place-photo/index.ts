/**
 * Supabase Edge Function to proxy Google Place photos.
 * Keeps the API key secure on the server side and avoids CORS/referrer issues.
 *
 * Usage (preferred — fetches fresh photo from Google using stable place ID):
 *   GET /place-photo?placeId=ChIJxxx&maxWidth=400
 *
 * Legacy usage (photo references expire — may return 400):
 *   GET /place-photo?photoName=places/xxx/photos/yyy&maxWidth=400
 *   GET /place-photo?photoReference=REF&maxWidth=400
 *
 * Requires GOOGLE_MAPS_API_KEY secret set in Supabase:
 *   supabase secrets set GOOGLE_MAPS_API_KEY=your_key
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Fetch a fresh photo name for a Google Place ID using the Places API (New).
 * Returns the first photo name or null.
 */
async function getFreshPhotoName(placeId: string, apiKey: string): Promise<string | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${apiKey}`
  try {
    const resp = await fetch(url)
    if (!resp.ok) {
      console.error('[place-photo] Places API error:', resp.status, await resp.text())
      return null
    }
    const data = await resp.json()
    const firstName = data.photos?.[0]?.name
    return firstName || null
  } catch (err) {
    console.error('[place-photo] Error fetching place details:', err)
    return null
  }
}

/**
 * Fetch the actual image bytes/redirect for a photo name or reference.
 */
async function fetchPhoto(photoUrl: string): Promise<Response> {
  const response = await fetch(photoUrl, { redirect: 'manual' })

  // Handle redirects (Google often 302s to the actual image CDN)
  if (response.status === 302 || response.status === 301) {
    const location = response.headers.get('Location')
    if (location) {
      return new Response(null, {
        status: 302,
        headers: { ...CORS_HEADERS, 'Location': location, 'Cache-Control': 'public, max-age=86400' },
      })
    }
  }

  if (response.ok) {
    const contentType = response.headers.get('Content-Type') || ''

    // New API may return JSON with photoUri
    if (contentType.includes('application/json')) {
      const data = await response.json()
      if (data.photoUri) {
        return new Response(null, {
          status: 302,
          headers: { ...CORS_HEADERS, 'Location': data.photoUri, 'Cache-Control': 'public, max-age=86400' },
        })
      }
    }

    // Return the image bytes directly
    const buffer = await response.arrayBuffer()
    return new Response(buffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // Forward error status
  const errorText = await response.text()
  console.error('[place-photo] Google photo error:', response.status, errorText.substring(0, 200))
  return new Response(errorText, {
    status: response.status,
    headers: CORS_HEADERS,
  })
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
  if (!API_KEY) {
    console.error('[place-photo] GOOGLE_MAPS_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const placeId = url.searchParams.get('placeId') || url.searchParams.get('place_id')
  const rawPhotoName = url.searchParams.get('photoName') || url.searchParams.get('photo_name')
  const photoName = rawPhotoName ? decodeURIComponent(rawPhotoName.trim()) : null
  const photoReference = url.searchParams.get('photoReference') || url.searchParams.get('photo_reference')
  const maxWidth = Math.min(Number(url.searchParams.get('maxWidth')) || 400, 1600)

  let photoUrl: string | null = null

  // Option 1: placeId — fetch fresh photo name from Google, then fetch image
  if (placeId) {
    const freshName = await getFreshPhotoName(placeId, API_KEY)
    if (!freshName) {
      return new Response(JSON.stringify({ error: 'No photos found for this place' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const mediaName = freshName.endsWith('/media') ? freshName : `${freshName}/media`
    photoUrl = `https://places.googleapis.com/v1/${mediaName}?maxWidthPx=${maxWidth}&maxHeightPx=${maxWidth}&key=${API_KEY}`
  }
  // Option 2: direct photoName
  else if (photoName) {
    const mediaName = photoName.endsWith('/media') ? photoName : `${photoName}/media`
    photoUrl = `https://places.googleapis.com/v1/${mediaName}?maxWidthPx=${maxWidth}&maxHeightPx=${maxWidth}&key=${API_KEY}`
  }
  // Option 3: legacy photoReference
  else if (photoReference) {
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoReference)}&key=${API_KEY}`
  }
  else {
    return new Response(JSON.stringify({ error: 'Missing placeId, photoName, or photoReference' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    return await fetchPhoto(photoUrl)
  } catch (err) {
    console.error('[place-photo] Fetch error:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch photo' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
