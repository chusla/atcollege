-- Add Dartmouth College and University of Hawaii to campuses

INSERT INTO campuses (name, city, state, country, latitude, longitude, timezone)
VALUES 
  (
    'Dartmouth College',
    'Hanover',
    'NH',
    'USA',
    43.7044,
    -72.2887,
    'America/New_York'
  ),
  (
    'University of Hawaii at Manoa',
    'Honolulu',
    'HI',
    'USA',
    21.2969,
    -157.8171,
    'Pacific/Honolulu'
  )
ON CONFLICT (name) DO NOTHING;

