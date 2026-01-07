-- Add Dartmouth College and University of Hawaii to campuses

INSERT INTO campuses (name, location, latitude, longitude)
VALUES 
  ('Dartmouth College', 'Hanover, NH', 43.7044, -72.2887),
  ('University of Hawaii at Manoa', 'Honolulu, HI', 21.2969, -157.8171)
ON CONFLICT DO NOTHING;
