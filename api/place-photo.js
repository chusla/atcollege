/**
 * Proxy for Google Place photos so images load without exposing the API key.
 * Usage: /api/place-photo?photoName=places/xxx/photos/yyy  OR  ?photoReference=REF
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return res.status(502).json({ error: 'API key not configured' });
  }

  const rawPhotoName = req.query.photoName || req.query.photo_name;
  const photoName = rawPhotoName ? decodeURIComponent(String(rawPhotoName).trim()) : null;
  const photoReference = req.query.photoReference || req.query.photo_reference;
  const maxWidth = Math.min(Number(req.query.maxWidth) || 400, 1600);

  let photoUrl;
  if (photoName) {
    // New API: path must be places/{placeId}/photos/{id}/media — do not encode slashes
    const mediaName = photoName.endsWith('/media') ? photoName : `${photoName}/media`;
    photoUrl = `https://places.googleapis.com/v1/${mediaName}?maxWidthPx=${maxWidth}&maxHeightPx=${maxWidth}&key=${API_KEY}`;
  } else if (photoReference) {
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoReference)}&key=${API_KEY}`;
  } else {
    return res.status(400).json({ error: 'Missing photoName or photoReference' });
  }

  try {
    const response = await fetch(photoUrl, { redirect: 'manual' });
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('Location');
      if (location) return res.redirect(302, location);
    }
    if (response.ok) {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.photoUri) return res.redirect(302, data.photoUri);
      }
      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
    return res.status(response.status).send(await response.text());
  } catch (err) {
    console.error('[place-photo]', err);
    return res.status(502).json({ error: 'Failed to fetch photo' });
  }
}
