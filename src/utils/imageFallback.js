/**
 * Image Fallback Utility
 * Provides contextual placeholder images when Google photos aren't available
 * 
 * Priority:
 * 1. Google Place photo (from API)
 * 2. Existing image_url (if valid)
 * 3. Contextual Unsplash image based on place type/category
 */

// Category to Unsplash search terms mapping
const CATEGORY_SEARCH_TERMS = {
  'Restaurants': 'restaurant,food,dining',
  'Cafes': 'cafe,coffee,coffeeshop',
  'Bars': 'bar,pub,nightlife',
  'Study Spots': 'library,study,books',
  'Entertainment': 'entertainment,fun,arcade',
  'Shopping': 'shopping,store,retail',
  'Housing': 'apartment,housing,home',
  'Other': 'building,place,location'
};

// Google type to search terms mapping
const GOOGLE_TYPE_SEARCH_TERMS = {
  'restaurant': 'restaurant,food,dining',
  'pizza_restaurant': 'pizza,italian,restaurant',
  'italian_restaurant': 'italian,pasta,restaurant',
  'mexican_restaurant': 'mexican,tacos,restaurant',
  'chinese_restaurant': 'chinese,asian,restaurant',
  'japanese_restaurant': 'sushi,japanese,restaurant',
  'indian_restaurant': 'indian,curry,restaurant',
  'american_restaurant': 'american,burger,restaurant',
  'cafe': 'cafe,coffee,latte',
  'coffee_shop': 'coffee,espresso,cafe',
  'bar': 'bar,cocktail,drinks',
  'night_club': 'nightclub,dance,party',
  'bakery': 'bakery,bread,pastry',
  'gym': 'gym,fitness,workout',
  'library': 'library,books,study',
  'book_store': 'bookstore,books,reading',
  'clothing_store': 'fashion,clothing,shopping',
  'shopping_mall': 'mall,shopping,retail',
  'movie_theater': 'cinema,movie,theater',
  'park': 'park,nature,outdoor',
  'museum': 'museum,art,culture',
  'university': 'university,campus,college',
  'school': 'school,education,classroom',
  'hospital': 'hospital,medical,healthcare',
  'pharmacy': 'pharmacy,medicine,health',
  'gas_station': 'gasstation,fuel,car',
  'car_wash': 'carwash,auto,clean',
  'hair_salon': 'salon,haircut,beauty',
  'spa': 'spa,wellness,relaxation',
  'lodging': 'hotel,room,accommodation',
  'tourist_attraction': 'landmark,tourism,sightseeing'
};

// Curated high-quality fallback images by category
const CURATED_FALLBACKS = {
  'Restaurants': [
    'photo-1517248135467-4c7edcad34c4', // Restaurant interior
    'photo-1552566626-52f8b828add9', // Restaurant table
    'photo-1414235077428-338989a2e8c0', // Fine dining
    'photo-1555396273-367ea4eb4db5', // Restaurant atmosphere
  ],
  'Cafes': [
    'photo-1554118811-1e0d58224f24', // Cafe interior
    'photo-1495474472287-4d71bcdd2085', // Coffee cup
    'photo-1501339847302-ac426a4a7cbb', // Cafe atmosphere
    'photo-1559925393-8be0ec4767c8', // Coffee shop
  ],
  'Bars': [
    'photo-1514933651103-005eec06c04b', // Bar interior
    'photo-1572116469696-31de0f17cc34', // Cocktail bar
    'photo-1525268323446-0505b6fe7778', // Bar drinks
    'photo-1566417713940-fe7c737a9ef2', // Night bar
  ],
  'Study Spots': [
    'photo-1521587760476-6c12a4b040da', // Library
    'photo-1507003211169-0a1dd7228f2d', // Study desk
    'photo-1524995997946-a1c2e315a42f', // Books
    'photo-1568667256549-094345857637', // Reading room
  ],
  'Entertainment': [
    'photo-1470229722913-7c0e2dbbafd3', // Concert
    'photo-1511882150382-421056c89033', // Arcade
    'photo-1485872299829-c673f5194813', // Fun activity
  ],
  'Shopping': [
    'photo-1441986300917-64674bd600d8', // Store
    'photo-1555529669-e69e7aa0ba9a', // Shopping
    'photo-1472851294608-062f824d29cc', // Retail
  ],
  'Housing': [
    'photo-1502672260266-1c1ef2d93688', // Apartment
    'photo-1560448204-e02f11c3d0e2', // Housing
    'photo-1522708323590-d24dbb6b0267', // Living room
  ],
  // Food-specific fallbacks
  'pizza': [
    'photo-1565299624946-b28f40a0ae38', // Pizza on table
    'photo-1574071318508-1cdbab80d002', // Fresh pizza
    'photo-1513104890138-7c749659a591', // Pizza whole
    'photo-1571407970349-bc81e7e96d47', // Pizza slice
  ],
  'burger': [
    'photo-1568901346375-23c9450c58cd', // Gourmet burger
    'photo-1550547660-d9450f859349', // Juicy burger
    'photo-1551782450-a2132b4ba21d', // Burger closeup
  ],
  'sushi': [
    'photo-1579871494447-9811cf80d66c', // Sushi platter
    'photo-1553621042-f6e147245754', // Sushi rolls
    'photo-1583623025817-d180a2221d0a', // Sushi restaurant
  ],
  'taco': [
    'photo-1565299585323-38d6b0865b47', // Tacos
    'photo-1551504734-5ee1c4a1479b', // Taco plate
    'photo-1624300629298-e9f8108b2259', // Street tacos
  ],
  'coffee': [
    'photo-1495474472287-4d71bcdd2085', // Coffee art
    'photo-1509042239860-f550ce710b93', // Coffee cup
    'photo-1497636577773-f1231844b336', // Coffee beans
  ],
  'bakery': [
    'photo-1509440159596-0249088772ff', // Fresh bread
    'photo-1517433670267-30f41c26cdfd', // Bakery display
    'photo-1558961363-fa8fdf82db35', // Croissants
  ],
  'chinese': [
    'photo-1525755662778-989d0524087e', // Chinese food
    'photo-1563245372-f21724e3856d', // Dim sum
    'photo-1585032226651-759b368d7246', // Noodles
  ],
  'italian': [
    'photo-1498579150354-977475b7ea0b', // Pasta
    'photo-1551183053-bf91a1d81141', // Italian dish
    'photo-1595295333158-4742f28fbd85', // Lasagna
  ],
  'mexican': [
    'photo-1565299585323-38d6b0865b47', // Mexican food
    'photo-1613514785940-daed07799d9b', // Nachos
    'photo-1599974579688-8dbdd335c77f', // Quesadilla
  ],
  'japanese': [
    'photo-1579871494447-9811cf80d66c', // Japanese food
    'photo-1617196034796-73dfa7b1fd56', // Ramen
    'photo-1580822184713-fc5400e7fe10', // Japanese restaurant
  ],
  'indian': [
    'photo-1585937421612-70a008356fbe', // Indian curry
    'photo-1567188040759-fb8a883dc6d8', // Naan bread
    'photo-1596797038530-2c107229654b', // Indian food spread
  ],
  'gym': [
    'photo-1534438327276-14e5300c3a48', // Gym interior
    'photo-1571902943202-507ec2618e8f', // Gym equipment
    'photo-1540497077202-7c8a3999166f', // Fitness center
  ],
  'spa': [
    'photo-1544161515-4ab6ce6db874', // Spa treatment
    'photo-1540555700478-4be289fbecef', // Relaxation
    'photo-1515377905703-c4788e51af15', // Spa setting
  ],
  'Other': [
    'photo-1486406146926-c627a92ad1ab', // Building
    'photo-1497366216548-37526070297c', // Office
    'photo-1497366811353-6870744d04b2', // Interior
  ]
};

/**
 * Get search terms for a place based on its category and Google types
 */
function getSearchTerms(place) {
  const terms = [];
  
  // Check Google types first (more specific)
  const googleTypes = place.google_place_data?.types || [];
  for (const type of googleTypes) {
    if (GOOGLE_TYPE_SEARCH_TERMS[type]) {
      terms.push(GOOGLE_TYPE_SEARCH_TERMS[type]);
      break; // Use the first match
    }
  }
  
  // Fall back to category
  if (terms.length === 0 && place.category) {
    terms.push(CATEGORY_SEARCH_TERMS[place.category] || CATEGORY_SEARCH_TERMS['Other']);
  }
  
  // Fall back to llm_category
  if (terms.length === 0 && place.llm_category) {
    terms.push(CATEGORY_SEARCH_TERMS[place.llm_category] || CATEGORY_SEARCH_TERMS['Other']);
  }
  
  // Add name-based terms for specificity
  const nameLower = (place.name || '').toLowerCase();
  if (nameLower.includes('pizza')) terms.push('pizza,italian');
  if (nameLower.includes('coffee')) terms.push('coffee,cafe');
  if (nameLower.includes('burger')) terms.push('burger,american');
  if (nameLower.includes('sushi')) terms.push('sushi,japanese');
  if (nameLower.includes('taco')) terms.push('tacos,mexican');
  
  return terms.length > 0 ? terms[0] : 'restaurant,food';
}

/**
 * Get a curated fallback image ID based on category
 */
function getCuratedFallback(place) {
  const nameLower = (place.name || '').toLowerCase();
  const googleTypes = place.google_place_data?.types || [];
  
  // Food-specific checks (order matters - more specific first)
  const foodChecks = [
    { keywords: ['pizza', 'pizzeria'], type: 'pizza_restaurant', key: 'pizza' },
    { keywords: ['burger', 'hamburger', "mcdonald's", 'wendy', 'five guys', 'shake shack'], type: 'hamburger_restaurant', key: 'burger' },
    { keywords: ['sushi', 'japanese', 'hibachi', 'ramen'], type: 'japanese_restaurant', key: 'japanese' },
    { keywords: ['taco', 'burrito', 'mexican', 'chipotle', 'taqueria'], type: 'mexican_restaurant', key: 'mexican' },
    { keywords: ['coffee', 'starbucks', 'cafe', 'espresso', 'latte'], type: 'cafe', key: 'coffee' },
    { keywords: ['bakery', 'bread', 'pastry', 'donut', 'bagel'], type: 'bakery', key: 'bakery' },
    { keywords: ['chinese', 'wok', 'dim sum', 'panda express'], type: 'chinese_restaurant', key: 'chinese' },
    { keywords: ['italian', 'pasta', 'olive garden', 'trattoria'], type: 'italian_restaurant', key: 'italian' },
    { keywords: ['indian', 'curry', 'tandoor', 'masala'], type: 'indian_restaurant', key: 'indian' },
    { keywords: ['gym', 'fitness', 'planet fitness', 'crossfit'], type: 'gym', key: 'gym' },
    { keywords: ['spa', 'massage', 'wellness'], type: 'spa', key: 'spa' },
  ];
  
  // Check by name keywords or Google type
  for (const check of foodChecks) {
    const nameMatch = check.keywords.some(kw => nameLower.includes(kw));
    const typeMatch = googleTypes.includes(check.type);
    
    if (nameMatch || typeMatch) {
      const images = CURATED_FALLBACKS[check.key];
      if (images && images.length > 0) {
        // Use place name hash for consistency
        const nameHash = (place.name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        return images[nameHash % images.length];
      }
    }
  }
  
  // Fall back to category-based images
  const category = place.category || place.llm_category || 'Other';
  const images = CURATED_FALLBACKS[category] || CURATED_FALLBACKS['Other'];
  
  // Use place name to consistently pick the same image for the same place
  const nameHash = (place.name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return images[nameHash % images.length];
}

/**
 * Generate search-based Unsplash URL using the Source API
 * Good for specific searches like "Dominos Pizza restaurant"
 * Note: Returns different images on each request (random selection)
 * @param {string} searchQuery - Search terms
 * @param {number} width - Desired image width
 * @returns {string} Unsplash Source URL
 */
export function getUnsplashSearchUrl(searchQuery, width = 400) {
  const height = Math.round(width * 0.75);
  // Unsplash Source API - free, no API key needed
  return `https://source.unsplash.com/featured/${width}x${height}/?${encodeURIComponent(searchQuery)}`;
}

/**
 * Generate a smart search query from place name
 * Extracts meaningful keywords for better image matching
 */
function getSmartSearchQuery(place) {
  const name = (place.name || '').toLowerCase();
  const terms = [];
  
  // Food-related keywords from name
  const foodKeywords = ['pizza', 'burger', 'sushi', 'taco', 'coffee', 'cafe', 'bakery', 'ice cream', 'thai', 'chinese', 'indian', 'mexican', 'italian', 'japanese', 'korean', 'vietnamese', 'greek', 'mediterranean', 'bbq', 'barbecue', 'steak', 'seafood', 'ramen', 'noodle', 'sandwich', 'deli', 'donut', 'bagel', 'brunch'];
  const businessKeywords = ['bar', 'pub', 'brewery', 'gym', 'fitness', 'yoga', 'salon', 'spa', 'library', 'bookstore', 'shop', 'store', 'market', 'theater', 'cinema', 'bowling', 'arcade'];
  
  for (const keyword of [...foodKeywords, ...businessKeywords]) {
    if (name.includes(keyword)) {
      terms.push(keyword);
    }
  }
  
  // Add category/type context
  const category = place.category || place.llm_category || '';
  if (category.toLowerCase().includes('restaurant')) {
    terms.push('restaurant');
  } else if (category.toLowerCase().includes('cafe')) {
    terms.push('cafe');
  } else if (category.toLowerCase().includes('bar')) {
    terms.push('bar');
  }
  
  // If we found specific terms, use them
  if (terms.length > 0) {
    return terms.slice(0, 2).join(' ');
  }
  
  // Default fallback based on category
  return getSearchTerms(place);
}

/**
 * Generate a fallback image URL for a place
 * @param {Object} place - The place object
 * @param {number} width - Desired image width (default 400)
 * @param {boolean} useRandom - Use random Unsplash source (default false for consistency)
 * @returns {string} Unsplash image URL
 */
export function getFallbackImageUrl(place, width = 400, useRandom = false) {
  if (useRandom) {
    // Use smart search query for more relevant random images
    const searchQuery = getSmartSearchQuery(place);
    return getUnsplashSearchUrl(searchQuery, width);
  }
  
  // Use curated images for consistency
  const imageId = getCuratedFallback(place);
  return `https://images.unsplash.com/${imageId}?w=${width}&fit=crop`;
}

/**
 * Get the best available image for a place
 * Priority: Google photo > place.image_url > Unsplash fallback
 * @param {Object} place - The place object
 * @param {number} width - Desired image width
 * @returns {string} Best available image URL
 */
export function getPlaceImageUrl(place, width = 400) {
  // 1. Check if place has a valid image_url (not a placeholder)
  if (place.image_url && 
      !place.image_url.includes('placeholder') &&
      !place.image_url.includes('unsplash.com/photo-1554118811')) { // Default cafe image
    return place.image_url;
  }
  
  // 2. Check Google place data for photos
  if (place.google_place_data?.photo_url) {
    return place.google_place_data.photo_url;
  }
  
  // 3. Fall back to contextual Unsplash image
  return getFallbackImageUrl(place, width);
}

/**
 * Check if a place needs a better image
 */
export function needsBetterImage(place) {
  if (!place.image_url) return true;
  if (place.image_url.includes('placeholder')) return true;
  if (place.image_url.includes('unsplash.com')) return true; // Generic unsplash fallback
  return false;
}

export default {
  getFallbackImageUrl,
  getPlaceImageUrl,
  getUnsplashSearchUrl,
  needsBetterImage
};
