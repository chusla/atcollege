-- ============================================
-- SEED DATA FOR atCollege
-- ============================================

-- Get Rice University's ID for sample data
-- We'll use Rice as the default campus for samples

-- ============================================
-- INTEREST GROUPS
-- ============================================
INSERT INTO interest_groups (name, description, category, image_url, member_count, status, source) VALUES
-- Sports Groups
('Running Club', 'Join fellow runners for weekly group runs around campus and the city. All paces welcome!', 'Sports', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400', 234, 'approved', 'admin'),
('Basketball Intramurals', 'Competitive and recreational basketball leagues for all skill levels.', 'Sports', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400', 189, 'approved', 'admin'),
('Soccer Club', 'Play pickup games and compete in intramural leagues. Co-ed teams available.', 'Sports', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400', 312, 'approved', 'admin'),
('Tennis Club', 'Weekly tennis meetups, lessons, and tournaments for players of all levels.', 'Sports', 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400', 98, 'approved', 'admin'),
('Volleyball Club', 'Indoor and beach volleyball games. Perfect for beginners and experienced players.', 'Sports', 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400', 156, 'approved', 'admin'),

-- Music Groups
('A Cappella Society', 'Student-run a cappella groups performing pop, jazz, and classical arrangements.', 'Music', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400', 87, 'approved', 'admin'),
('Jazz Ensemble', 'Weekly jam sessions and performances. All instruments welcome.', 'Music', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 45, 'approved', 'admin'),
('Guitar Club', 'Learn guitar, share tabs, and jam with other guitarists on campus.', 'Music', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400', 123, 'approved', 'admin'),
('Electronic Music Producers', 'Collaborate on beats, share production tips, and host listening parties.', 'Music', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', 67, 'approved', 'admin'),

-- Arts Groups
('Photography Club', 'Photo walks, editing workshops, and gallery exhibitions.', 'Arts', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400', 203, 'approved', 'admin'),
('Film Society', 'Weekly movie screenings, discussions, and student film productions.', 'Arts', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 178, 'approved', 'admin'),
('Art Studio', 'Open studio hours, life drawing sessions, and collaborative art projects.', 'Arts', 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400', 92, 'approved', 'admin'),
('Creative Writing Circle', 'Share your work, get feedback, and participate in writing challenges.', 'Arts', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400', 64, 'approved', 'admin'),

-- Technology Groups
('Coding Club', 'Hackathons, coding challenges, and tech talks. All programming languages.', 'Technology', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400', 445, 'approved', 'admin'),
('AI/ML Society', 'Explore machine learning, deep learning, and AI applications together.', 'Technology', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400', 267, 'approved', 'admin'),
('Cybersecurity Club', 'CTF competitions, security workshops, and ethical hacking sessions.', 'Technology', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400', 134, 'approved', 'admin'),
('Robotics Team', 'Design, build, and compete with robots in national competitions.', 'Technology', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400', 89, 'approved', 'admin'),
('Web Dev Community', 'Learn web development, build projects, and share resources.', 'Technology', 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400', 312, 'approved', 'admin'),

-- Food Groups
('Foodies Club', 'Restaurant reviews, cooking competitions, and food truck hunting.', 'Food', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', 423, 'approved', 'admin'),
('Baking Society', 'Weekly bake-offs, recipe sharing, and bake sales for charity.', 'Food', 'https://images.unsplash.com/photo-1486427944544-d2c6128c1858?w=400', 156, 'approved', 'admin'),
('Coffee Enthusiasts', 'Explore local cafes, learn brewing methods, and discuss coffee culture.', 'Food', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', 198, 'approved', 'admin'),

-- Gaming Groups
('Esports Team', 'Competitive gaming in League, Valorant, CS2, and more.', 'Gaming', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', 534, 'approved', 'admin'),
('Board Game Night', 'Weekly board game meetups. From Catan to D&D campaigns.', 'Gaming', 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400', 189, 'approved', 'admin'),
('Chess Club', 'Casual games, tournaments, and lessons for all skill levels.', 'Gaming', 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400', 145, 'approved', 'admin'),

-- Fitness Groups  
('Yoga & Wellness', 'Daily yoga sessions, meditation, and wellness workshops.', 'Fitness', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', 287, 'approved', 'admin'),
('CrossFit Crew', 'High-intensity workouts and fitness challenges. All levels welcome.', 'Fitness', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', 123, 'approved', 'admin'),
('Swimming Club', 'Lap swimming, water polo, and swim lessons.', 'Fitness', 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400', 98, 'approved', 'admin'),

-- Reading Groups
('Book Club', 'Monthly book discussions spanning fiction, non-fiction, and classics.', 'Reading', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400', 156, 'approved', 'admin'),
('Philosophy Society', 'Deep discussions on ethics, existence, and everything in between.', 'Reading', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400', 78, 'approved', 'admin'),

-- Travel Groups
('Hiking & Outdoors', 'Weekend hikes, camping trips, and outdoor adventures.', 'Travel', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400', 234, 'approved', 'admin'),
('International Students Association', 'Cultural events, travel tips, and community for international students.', 'Travel', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400', 567, 'approved', 'admin'),

-- Volunteering Groups
('Community Service Corps', 'Weekly volunteer opportunities at local nonprofits and community centers.', 'Volunteering', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400', 345, 'approved', 'admin'),
('Environmental Club', 'Campus sustainability projects, cleanups, and environmental advocacy.', 'Volunteering', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400', 189, 'approved', 'admin'),
('Tutoring Network', 'Volunteer tutoring for local K-12 students in all subjects.', 'Volunteering', 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400', 234, 'approved', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================
-- EVENTS
-- ============================================
INSERT INTO events (title, description, category, location, image_url, date, time, status, source) VALUES
-- Sports Events
('Intramural Basketball Finals', 'Watch the best teams compete for the championship title. Free food and drinks!', 'Sports', 'Main Gymnasium', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600', CURRENT_DATE + INTERVAL '3 days', '7:00 PM', 'approved', 'admin'),
('5K Fun Run', 'Annual charity run around campus. All proceeds go to local food banks.', 'Sports', 'Campus Main Entrance', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600', CURRENT_DATE + INTERVAL '10 days', '8:00 AM', 'approved', 'admin'),
('Yoga in the Park', 'Free outdoor yoga session. Bring your own mat or borrow one.', 'Sports', 'Central Quad', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600', CURRENT_DATE + INTERVAL '2 days', '6:00 PM', 'approved', 'admin'),
('Tennis Tournament', 'Singles and doubles tournament. Sign up by Friday!', 'Sports', 'Tennis Courts', 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600', CURRENT_DATE + INTERVAL '14 days', '9:00 AM', 'approved', 'admin'),

-- Shows Events
('Spring Concert', 'Live performances featuring student bands and a special guest headliner.', 'Shows', 'Outdoor Amphitheater', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600', CURRENT_DATE + INTERVAL '21 days', '7:00 PM', 'approved', 'admin'),
('Comedy Night', 'Student comedians showcase their best material. Open mic afterwards!', 'Shows', 'Student Center Theater', 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=600', CURRENT_DATE + INTERVAL '5 days', '8:00 PM', 'approved', 'admin'),
('Film Festival', 'Screening of award-winning student short films. Q&A with filmmakers.', 'Shows', 'Media Center', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600', CURRENT_DATE + INTERVAL '12 days', '6:30 PM', 'approved', 'admin'),
('Dance Showcase', 'Annual dance performance featuring ballet, hip-hop, and contemporary.', 'Shows', 'Performing Arts Center', 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=600', CURRENT_DATE + INTERVAL '18 days', '7:30 PM', 'approved', 'admin'),

-- Talks Events
('Tech Industry Panel', 'Engineers from Google, Meta, and startups discuss career paths.', 'Talks', 'Engineering Building Auditorium', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600', CURRENT_DATE + INTERVAL '7 days', '5:00 PM', 'approved', 'admin'),
('Climate Change Symposium', 'Leading researchers discuss the latest in climate science and policy.', 'Talks', 'Science Center', 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600', CURRENT_DATE + INTERVAL '9 days', '3:00 PM', 'approved', 'admin'),
('Entrepreneurship Workshop', 'Learn how to turn your idea into a startup. Networking session after.', 'Talks', 'Business School', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600', CURRENT_DATE + INTERVAL '4 days', '4:00 PM', 'approved', 'admin'),
('Author Reading', 'Pulitzer Prize winner reads from their latest book. Book signing follows.', 'Talks', 'University Library', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600', CURRENT_DATE + INTERVAL '11 days', '7:00 PM', 'approved', 'admin'),

-- Social Events
('Welcome Week BBQ', 'Free food, music, and games. Meet new friends and learn about campus orgs.', 'Social', 'Main Quad', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', CURRENT_DATE + INTERVAL '1 day', '12:00 PM', 'approved', 'admin'),
('International Food Festival', 'Taste dishes from around the world prepared by student cultural organizations.', 'Social', 'Student Center Plaza', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600', CURRENT_DATE + INTERVAL '15 days', '11:00 AM', 'approved', 'admin'),
('Game Night', 'Board games, video games, and prizes. Pizza provided!', 'Social', 'Recreation Center', 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600', CURRENT_DATE + INTERVAL '6 days', '7:00 PM', 'approved', 'admin'),
('Trivia Night', 'Test your knowledge and win prizes. Teams of up to 6 people.', 'Social', 'Campus Pub', 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600', CURRENT_DATE + INTERVAL '8 days', '8:00 PM', 'approved', 'admin'),

-- Academic Events
('Research Symposium', 'Undergraduate and graduate students present their research projects.', 'Academic', 'Convention Center', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600', CURRENT_DATE + INTERVAL '20 days', '9:00 AM', 'approved', 'admin'),
('Study Abroad Fair', 'Learn about international programs and meet program coordinators.', 'Academic', 'Student Center Ballroom', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600', CURRENT_DATE + INTERVAL '13 days', '10:00 AM', 'approved', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================
-- PLACES
-- ============================================
INSERT INTO places (name, description, category, address, image_url, rating, status, source) VALUES
-- Bars
('The Pub', 'Classic college bar with cheap drinks, pool tables, and live music on weekends.', 'Bars', '2420 Rice Blvd', 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600', 4.2, 'approved', 'admin'),
('Valhalla', 'On-campus bar run by graduate students. Cash only, great atmosphere.', 'Bars', 'Ley Student Center', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600', 4.5, 'approved', 'admin'),
('Little Woodrows', 'Sports bar with outdoor patio, great for watching games with friends.', 'Bars', '2306 Brazos St', 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600', 4.0, 'approved', 'admin'),
('Maple Leaf Pub', 'Irish pub with live music, trivia nights, and a great beer selection.', 'Bars', '514 Elgin St', 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600', 4.3, 'approved', 'admin'),

-- Restaurants
('Torchys Tacos', 'Creative tacos with bold flavors. Try the Trailer Park (trashy style)!', 'Restaurants', '2400 Rice Blvd', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600', 4.6, 'approved', 'admin'),
('Chipotle', 'Fast-casual Mexican. Build your own bowl, burrito, or tacos.', 'Restaurants', '2540 Amherst St', 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=600', 4.1, 'approved', 'admin'),
('Pho Saigon', 'Authentic Vietnamese pho and banh mi. Student favorite for late nights.', 'Restaurants', '2808 Milam St', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600', 4.4, 'approved', 'admin'),
('House of Pies', '24-hour diner famous for pies. Perfect for late-night study breaks.', 'Restaurants', '3112 Kirby Dr', 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=600', 4.2, 'approved', 'admin'),
('Shake Shack', 'Premium burgers, hot dogs, and frozen custard. Long lines but worth it.', 'Restaurants', 'Rice Village', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600', 4.5, 'approved', 'admin'),
('Velvet Taco', 'Globally-inspired tacos. Try the chicken tikka or the rotisserie chicken.', 'Restaurants', '2603 Westheimer Rd', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600', 4.3, 'approved', 'admin'),

-- Cafes
('Brewed Awakening', 'Cozy cafe with great pour-over coffee and study-friendly vibes.', 'Cafes', 'Student Center', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600', 4.7, 'approved', 'admin'),
('Fondren Library Cafe', 'Quick coffee and snacks in the library. Perfect between classes.', 'Cafes', 'Fondren Library', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', 4.0, 'approved', 'admin'),
('Black Hole Coffee', 'Specialty coffee shop with rotating single-origin beans.', 'Cafes', '4504 Graustark St', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600', 4.6, 'approved', 'admin'),
('Cafe Brasil', 'Brazilian cafe with strong coffee and late-night hours.', 'Cafes', '2604 Dunlavy St', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600', 4.4, 'approved', 'admin'),
('Starbucks Village', 'Reliable Starbucks with plenty of seating for study sessions.', 'Cafes', 'Rice Village', 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600', 3.9, 'approved', 'admin'),

-- Study Spots
('Fondren Library', 'Main library with quiet floors, group rooms, and 24-hour access during finals.', 'Study Spots', 'Campus', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600', 4.8, 'approved', 'admin'),
('Brochstein Pavilion', 'Glass pavilion with cafe, beautiful views, and collaborative spaces.', 'Study Spots', 'Campus Center', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600', 4.6, 'approved', 'admin'),
('Engineering Library', 'Quiet study space perfect for STEM students. Great natural light.', 'Study Spots', 'Engineering Quad', 'https://images.unsplash.com/photo-1568667256549-094345857637?w=600', 4.5, 'approved', 'admin'),
('The Hive', 'Graduate student workspace with standing desks and whiteboards.', 'Study Spots', 'Business School', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600', 4.4, 'approved', 'admin'),

-- Housing
('The Lofts at Rice Village', 'Modern apartments walking distance to campus. Rooftop pool.', 'Housing', 'Rice Village', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600', 4.3, 'approved', 'admin'),
('University Apartments', 'Affordable housing for grad students. Utilities included.', 'Housing', '2401 University Blvd', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600', 3.8, 'approved', 'admin'),
('The Museum District Apartments', 'Near campus and museums. Great for culture lovers.', 'Housing', 'Museum District', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600', 4.1, 'approved', 'admin'),

-- Entertainment
('AMC Rice Village', 'Movie theater with reclining seats and IMAX. Student discounts available.', 'Entertainment', 'Rice Village', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600', 4.2, 'approved', 'admin'),
('Museum of Fine Arts', 'World-class art museum. Free admission on Thursdays for students.', 'Entertainment', '1001 Bissonnet St', 'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=600', 4.7, 'approved', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================
-- OPPORTUNITIES
-- ============================================
INSERT INTO opportunities (title, description, type, organization, location, image_url, deadline, status, source) VALUES
-- Volunteer
('Hospital Volunteer Program', 'Help patients and families at Texas Medical Center. Training provided.', 'Volunteer', 'Texas Medical Center', 'Houston, TX', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600', CURRENT_DATE + INTERVAL '30 days', 'approved', 'admin'),
('Food Bank Volunteer', 'Sort and distribute food to families in need. Flexible scheduling.', 'Volunteer', 'Houston Food Bank', 'Houston, TX', 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600', NULL, 'approved', 'admin'),
('Habitat for Humanity Build', 'Help build homes for families in need. No experience required.', 'Volunteer', 'Habitat for Humanity', 'Houston, TX', 'https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=600', CURRENT_DATE + INTERVAL '14 days', 'approved', 'admin'),
('Tutoring K-12 Students', 'Help local students with homework and test prep. 2-4 hours/week.', 'Volunteer', 'Houston ISD', 'Various Schools', 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600', NULL, 'approved', 'admin'),
('Animal Shelter Helper', 'Walk dogs, socialize cats, and help with adoptions.', 'Volunteer', 'Houston SPCA', 'Houston, TX', 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600', NULL, 'approved', 'admin'),

-- Work (Part-time)
('Library Student Assistant', 'Help patrons, shelve books, and maintain library spaces. $15/hr.', 'Work', 'Fondren Library', 'Campus', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600', CURRENT_DATE + INTERVAL '7 days', 'approved', 'admin'),
('Campus Tour Guide', 'Lead tours for prospective students and families. Great communication skills required.', 'Work', 'Admissions Office', 'Campus', 'https://images.unsplash.com/photo-1562774053-701939374585?w=600', CURRENT_DATE + INTERVAL '21 days', 'approved', 'admin'),
('Research Lab Assistant', 'Assist with data collection and lab maintenance. Biology majors preferred.', 'Work', 'Biology Department', 'Campus', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600', CURRENT_DATE + INTERVAL '10 days', 'approved', 'admin'),
('Coffee Shop Barista', 'Make drinks and provide great customer service. Training provided.', 'Work', 'Brewed Awakening', 'Student Center', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', CURRENT_DATE + INTERVAL '14 days', 'approved', 'admin'),
('IT Help Desk', 'Help students and staff with tech issues. Computer science experience helpful.', 'Work', 'IT Services', 'Campus', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600', CURRENT_DATE + INTERVAL '5 days', 'approved', 'admin'),
('Recreation Center Staff', 'Manage equipment, assist patrons, and maintain facilities. $14/hr.', 'Work', 'Recreation Center', 'Campus', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600', CURRENT_DATE + INTERVAL '10 days', 'approved', 'admin'),

-- Internships
('Software Engineering Intern', 'Build features for our mobile app. React Native experience preferred.', 'Internship', 'Tech Startup', 'Houston, TX', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600', CURRENT_DATE + INTERVAL '45 days', 'approved', 'admin'),
('Marketing Intern', 'Help with social media, content creation, and campaign analytics.', 'Internship', 'Marketing Agency', 'Houston, TX', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', CURRENT_DATE + INTERVAL '30 days', 'approved', 'admin'),
('Finance Intern', 'Support investment analysis and financial modeling. Excel skills required.', 'Internship', 'Investment Firm', 'Downtown Houston', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600', CURRENT_DATE + INTERVAL '60 days', 'approved', 'admin'),
('Data Science Intern', 'Work with big data, build ML models, and create visualizations.', 'Internship', 'Energy Company', 'Houston, TX', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600', CURRENT_DATE + INTERVAL '40 days', 'approved', 'admin'),
('Nonprofit Management Intern', 'Learn nonprofit operations, fundraising, and program management.', 'Internship', 'Local Nonprofit', 'Houston, TX', 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600', CURRENT_DATE + INTERVAL '35 days', 'approved', 'admin'),

-- Research
('Undergraduate Research Assistant', 'Join a neuroscience lab studying memory and cognition.', 'Research', 'Psychology Department', 'Campus', 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600', CURRENT_DATE + INTERVAL '20 days', 'approved', 'admin'),
('Climate Research Fellowship', 'Paid summer research on climate modeling. $5000 stipend.', 'Research', 'Environmental Science', 'Campus', 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600', CURRENT_DATE + INTERVAL '50 days', 'approved', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================
-- Link sample data to Rice University campus
-- ============================================
UPDATE events SET campus_id = (SELECT id FROM campuses WHERE name = 'Rice University' LIMIT 1) WHERE campus_id IS NULL;
UPDATE places SET campus_id = (SELECT id FROM campuses WHERE name = 'Rice University' LIMIT 1) WHERE campus_id IS NULL;
UPDATE opportunities SET campus_id = (SELECT id FROM campuses WHERE name = 'Rice University' LIMIT 1) WHERE campus_id IS NULL;
UPDATE interest_groups SET campus_id = (SELECT id FROM campuses WHERE name = 'Rice University' LIMIT 1) WHERE campus_id IS NULL;

