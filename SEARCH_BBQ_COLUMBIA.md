# How to Search for BBQ Spots Near Columbia University

## Current UX Flow

### Step 1: Ensure Columbia University is Selected
1. Log in to the app
2. If you haven't selected a campus yet, go through onboarding or update your profile
3. Make sure your `selected_campus_id` points to Columbia University

### Step 2: Perform the Search
1. Go to the **Home** page (`/Home`)
2. In the search bar, type: **"bbq"** or **"barbecue"**
3. Select **Category**: "All Categories" (or leave as is)
4. Select **Radius**: "5 miles" (or your preferred distance)
5. Press Enter or wait for the search to execute automatically

### Step 3: What Happens Behind the Scenes
- The app gets Columbia University's coordinates (40.8075, -73.9626)
- It calls Google Places API with the query "bbq" near that location
- For each new place found:
  - Checks if it already exists in the database (by `google_place_id`)
  - If new, creates a record in the `places` table with:
    - `name`, `address`, `latitude`, `longitude`, `rating`
    - `google_place_id` (unique identifier)
    - `google_place_data` (full JSON from Google)
    - `source: 'google_maps'`
    - `status: 'pending'` (needs admin approval)
    - `categorization_status: 'pending'` (will be categorized by LLM)
    - `campus_id` (linked to Columbia University)
    - `imported_at` (timestamp)

### Step 4: Verify Results in Database

Run this SQL query in Supabase SQL Editor to see what was stored:

```sql
-- View all BBQ-related places imported for Columbia University
SELECT 
  id,
  name,
  address,
  latitude,
  longitude,
  rating,
  google_place_id,
  source,
  status,
  categorization_status,
  campus_id,
  imported_at,
  created_at
FROM places
WHERE 
  campus_id = (SELECT id FROM campuses WHERE name = 'Columbia University' LIMIT 1)
  AND (
    LOWER(name) LIKE '%bbq%' 
    OR LOWER(name) LIKE '%barbecue%'
    OR LOWER(name) LIKE '%barbeque%'
    OR LOWER(address) LIKE '%bbq%'
  )
  AND source = 'google_maps'
ORDER BY imported_at DESC;
```

Or see ALL recently imported places (not just BBQ):

```sql
-- View all recently imported Google Places for Columbia
SELECT 
  p.id,
  p.name,
  p.address,
  p.rating,
  p.status,
  p.categorization_status,
  p.imported_at,
  c.name as campus_name
FROM places p
LEFT JOIN campuses c ON p.campus_id = c.id
WHERE 
  p.source = 'google_maps'
  AND p.campus_id = (SELECT id FROM campuses WHERE name = 'Columbia University' LIMIT 1)
ORDER BY p.imported_at DESC
LIMIT 20;
```

### Step 5: View Raw Google Data

To see the full Google Places data stored:

```sql
-- View the raw Google Places data
SELECT 
  name,
  address,
  rating,
  google_place_id,
  google_place_data,
  imported_at
FROM places
WHERE 
  campus_id = (SELECT id FROM campuses WHERE name = 'Columbia University' LIMIT 1)
  AND source = 'google_maps'
  AND (
    LOWER(name) LIKE '%bbq%' 
    OR LOWER(name) LIKE '%barbecue%'
  )
ORDER BY imported_at DESC;
```

## Alternative: View in Admin Panel

You can also view the imported places in the Admin panel:

1. Log in as admin
2. Go to **Admin → Content** (`/AdminContent`)
3. In the Places tab, use the filters:
   - **Source Filter**: Select "google_maps" to see only Google Places imports
   - **Categorization Filter**: Select "pending" to see newly imported places
4. You'll see all places with their details, status, and can approve/reject them

## Notes

- New places are created with `status: 'pending'` - they need admin approval to show in regular searches
- The `categorization_status` will be updated by the LLM categorization queue
- Places are deduplicated by `google_place_id` - if you search again, existing places won't be duplicated
- The search results shown in the UI are limited to 5 per category, but all matching places are stored in the database
- You can approve places directly from the Admin Content page

