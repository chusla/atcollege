-- ============================================
-- ADD COORDINATES TO SEED DATA
-- Run this after 002_seed_data.sql
-- ============================================

-- Update Places with coordinates (Rice University area - Houston, TX)
UPDATE places SET 
  latitude = 29.7174 + (random() * 0.02 - 0.01),
  longitude = -95.4018 + (random() * 0.02 - 0.01)
WHERE latitude IS NULL AND campus_id = (SELECT id FROM campuses WHERE name = 'Rice University' LIMIT 1);

-- Specific coordinates for key places near Rice
UPDATE places SET latitude = 29.7165, longitude = -95.4030 WHERE name = 'The Pub' AND latitude IS NULL;
UPDATE places SET latitude = 29.7175, longitude = -95.4012 WHERE name = 'Valhalla' AND latitude IS NULL;
UPDATE places SET latitude = 29.7268, longitude = -95.3901 WHERE name = 'Little Woodrows' AND latitude IS NULL;
UPDATE places SET latitude = 29.7512, longitude = -95.3702 WHERE name = 'Maple Leaf Pub' AND latitude IS NULL;
UPDATE places SET latitude = 29.7161, longitude = -95.4055 WHERE name = 'Torchys Tacos' AND latitude IS NULL;
UPDATE places SET latitude = 29.7159, longitude = -95.4080 WHERE name = 'Chipotle' AND latitude IS NULL;
UPDATE places SET latitude = 29.7420, longitude = -95.3850 WHERE name = 'Pho Saigon' AND latitude IS NULL;
UPDATE places SET latitude = 29.7340, longitude = -95.4215 WHERE name = 'House of Pies' AND latitude IS NULL;
UPDATE places SET latitude = 29.7163, longitude = -95.4045 WHERE name = 'Shake Shack' AND latitude IS NULL;
UPDATE places SET latitude = 29.7428, longitude = -95.4040 WHERE name = 'Velvet Taco' AND latitude IS NULL;
UPDATE places SET latitude = 29.7180, longitude = -95.4010 WHERE name = 'Brewed Awakening' AND latitude IS NULL;
UPDATE places SET latitude = 29.7178, longitude = -95.4003 WHERE name = 'Fondren Library Cafe' AND latitude IS NULL;
UPDATE places SET latitude = 29.7310, longitude = -95.4140 WHERE name = 'Black Hole Coffee' AND latitude IS NULL;
UPDATE places SET latitude = 29.7455, longitude = -95.4020 WHERE name = 'Cafe Brasil' AND latitude IS NULL;
UPDATE places SET latitude = 29.7160, longitude = -95.4065 WHERE name = 'Starbucks Village' AND latitude IS NULL;
UPDATE places SET latitude = 29.7178, longitude = -95.4002 WHERE name = 'Fondren Library' AND latitude IS NULL;
UPDATE places SET latitude = 29.7176, longitude = -95.4000 WHERE name = 'Brochstein Pavilion' AND latitude IS NULL;
UPDATE places SET latitude = 29.7201, longitude = -95.3980 WHERE name = 'Engineering Library' AND latitude IS NULL;
UPDATE places SET latitude = 29.7195, longitude = -95.3992 WHERE name = 'The Hive' AND latitude IS NULL;
UPDATE places SET latitude = 29.7150, longitude = -95.4100 WHERE name = 'The Lofts at Rice Village' AND latitude IS NULL;
UPDATE places SET latitude = 29.7190, longitude = -95.4050 WHERE name = 'University Apartments' AND latitude IS NULL;
UPDATE places SET latitude = 29.7220, longitude = -95.3875 WHERE name = 'The Museum District Apartments' AND latitude IS NULL;
UPDATE places SET latitude = 29.7155, longitude = -95.4090 WHERE name = 'AMC Rice Village' AND latitude IS NULL;
UPDATE places SET latitude = 29.7255, longitude = -95.3908 WHERE name = 'Museum of Fine Arts' AND latitude IS NULL;

-- Update Events with coordinates (campus locations)
UPDATE events SET latitude = 29.7182, longitude = -95.3995 WHERE location LIKE '%Gymnasium%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7170, longitude = -95.4015 WHERE location LIKE '%Main%' OR location LIKE '%Quad%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7175, longitude = -95.4008 WHERE location LIKE '%Central%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7165, longitude = -95.3988 WHERE location LIKE '%Tennis%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7188, longitude = -95.3975 WHERE location LIKE '%Amphitheater%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7180, longitude = -95.4010 WHERE location LIKE '%Student Center%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7185, longitude = -95.3990 WHERE location LIKE '%Media%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7190, longitude = -95.3985 WHERE location LIKE '%Performing%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7205, longitude = -95.3980 WHERE location LIKE '%Engineering%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7210, longitude = -95.3970 WHERE location LIKE '%Science%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7195, longitude = -95.3992 WHERE location LIKE '%Business%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7178, longitude = -95.4003 WHERE location LIKE '%Library%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7178, longitude = -95.4020 WHERE location LIKE '%Recreation%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7172, longitude = -95.4022 WHERE location LIKE '%Pub%' AND latitude IS NULL;
UPDATE events SET latitude = 29.7200, longitude = -95.3965 WHERE location LIKE '%Convention%' AND latitude IS NULL;

-- Add random coordinates for any remaining events near Rice
UPDATE events SET 
  latitude = 29.7174 + (random() * 0.01 - 0.005),
  longitude = -95.4018 + (random() * 0.01 - 0.005)
WHERE latitude IS NULL AND campus_id = (SELECT id FROM campuses WHERE name = 'Rice University' LIMIT 1);

-- Update Opportunities with coordinates
UPDATE opportunities SET latitude = 29.7105, longitude = -95.3965 WHERE location LIKE '%Medical%' AND latitude IS NULL;
UPDATE opportunities SET latitude = 29.7020, longitude = -95.3580 WHERE organization LIKE '%Food Bank%' AND latitude IS NULL;
UPDATE opportunities SET latitude = 29.7600, longitude = -95.3700 WHERE organization LIKE '%Habitat%' AND latitude IS NULL;
UPDATE opportunities SET latitude = 29.7500, longitude = -95.3800 WHERE organization LIKE '%Houston ISD%' AND latitude IS NULL;
UPDATE opportunities SET latitude = 29.7150, longitude = -95.4300 WHERE organization LIKE '%SPCA%' AND latitude IS NULL;
UPDATE opportunities SET latitude = 29.7178, longitude = -95.4002 WHERE location LIKE '%Campus%' OR location = 'Campus' AND latitude IS NULL;
UPDATE opportunities SET latitude = 29.7600, longitude = -95.3650 WHERE location LIKE '%Downtown%' AND latitude IS NULL;

-- Add random coordinates for any remaining opportunities near Rice
UPDATE opportunities SET 
  latitude = 29.7174 + (random() * 0.03 - 0.015),
  longitude = -95.4018 + (random() * 0.03 - 0.015)
WHERE latitude IS NULL AND campus_id = (SELECT id FROM campuses WHERE name = 'Rice University' LIMIT 1);

