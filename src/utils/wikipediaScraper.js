/**
 * Wikipedia Scraper for University Branding
 * Fetches school colors and logos from Wikipedia infoboxes
 */

const WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1';
const WIKIPEDIA_QUERY_API = 'https://en.wikipedia.org/w/api.php';

// Common color name to hex mapping
const COLOR_NAME_TO_HEX = {
  // Greens
  'green': '#008000',
  'dark green': '#006400',
  'dartmouth green': '#00693E',
  'forest green': '#228B22',
  'hunter green': '#355E3B',
  'ivy green': '#4B6F44',
  // Blues
  'blue': '#0000FF',
  'navy': '#000080',
  'navy blue': '#000080',
  'royal blue': '#4169E1',
  'columbia blue': '#B9D9EB',
  'carolina blue': '#7BAFD4',
  'yale blue': '#0F4D92',
  'light blue': '#ADD8E6',
  'sky blue': '#87CEEB',
  // Reds
  'red': '#FF0000',
  'crimson': '#DC143C',
  'cardinal': '#C41E3A',
  'maroon': '#800000',
  'scarlet': '#FF2400',
  'burgundy': '#800020',
  // Oranges
  'orange': '#FFA500',
  'burnt orange': '#CC5500',
  'princeton orange': '#FF8F00',
  // Purples
  'purple': '#800080',
  'violet': '#8B00FF',
  'lavender': '#E6E6FA',
  // Yellows/Golds
  'yellow': '#FFFF00',
  'gold': '#FFD700',
  'old gold': '#CFB53B',
  // Neutrals
  'white': '#FFFFFF',
  'black': '#000000',
  'gray': '#808080',
  'grey': '#808080',
  'silver': '#C0C0C0',
  // Browns
  'brown': '#8B4513',
  // Specific school colors
  'cornell red': '#B31B1B',
  'big red': '#B31B1B',
  'stanford cardinal': '#8C1515',
  'harvard crimson': '#A51C30',
  'penn red': '#990000',
  'berkeley blue': '#003262',
  'ucla blue': '#2774AE',
  'michigan maize': '#FFCB05',
  'michigan blue': '#00274C',
  'notre dame gold': '#C99700',
  'usc cardinal': '#990000',
  'usc gold': '#FFCC00',
  'tufts blue': '#3E8EDE',
  'columbia blue': '#B9D9EB',
  'princeton orange': '#FF8F00',
  'duke blue': '#003087',
  'tar heel blue': '#7BAFD4',
  'aggie maroon': '#500000',
  'burnt orange': '#BF5700',
  'cream': '#FFFDD0',
  'old gold': '#CFB53B',
  'vegas gold': '#C5B358',
  'irish green': '#00843D',
  'fighting irish green': '#0C2340',
  'trojan cardinal': '#9D2235',
  'trojans gold': '#FFC72C',
};

// Mapping of common abbreviations/short names to full Wikipedia page titles
const UNIVERSITY_NAME_MAP = {
  'mit': 'Massachusetts Institute of Technology',
  'ucla': 'University of California, Los Angeles',
  'uc berkeley': 'University of California, Berkeley',
  'ucb': 'University of California, Berkeley',
  'usc': 'University of Southern California',
  'nyu': 'New York University',
  'bu': 'Boston University',
  'bc': 'Boston College',
  'caltech': 'California Institute of Technology',
  'georgia tech': 'Georgia Institute of Technology',
  'ut austin': 'University of Texas at Austin',
  'penn': 'University of Pennsylvania',
  'upenn': 'University of Pennsylvania',
  'unc': 'University of North Carolina at Chapel Hill',
  'osu': 'Ohio State University',
  'psu': 'Pennsylvania State University',
  'uva': 'University of Virginia',
  'uw': 'University of Washington',
  'umich': 'University of Michigan',
  'umd': 'University of Maryland, College Park',
  'uiuc': 'University of Illinois Urbana-Champaign',
  'texas a&m': 'Texas A&M University',
  'tamu': 'Texas A&M University',
};

/**
 * Search Wikipedia for a university page
 * @param {string} universityName 
 * @returns {Promise<string|null>} Wikipedia page title or null
 */
async function searchWikipedia(universityName) {
  try {
    // Check if we have a direct mapping for this name
    const normalizedName = universityName.toLowerCase().trim();
    const mappedName = UNIVERSITY_NAME_MAP[normalizedName];
    
    // Use mapped name if available, otherwise use original
    const searchQuery = mappedName || universityName;
    console.log('🎓 [WIKIPEDIA] Searching for:', searchQuery, mappedName ? '(mapped)' : '');
    
    const url = `${WIKIPEDIA_QUERY_API}?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.query?.search?.length > 0) {
      // Return the first result that looks like a university page
      for (const result of data.query.search) {
        const title = result.title.toLowerCase();
        if (title.includes('university') || title.includes('college') || title.includes('institute')) {
          console.log('🎓 [WIKIPEDIA] Found page:', result.title);
          return result.title;
        }
      }
      // Fallback to first result
      console.log('🎓 [WIKIPEDIA] Using first result:', data.query.search[0].title);
      return data.query.search[0].title;
    }
    return null;
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return null;
  }
}

/**
 * Get the infobox data from a Wikipedia page
 * @param {string} pageTitle 
 * @returns {Promise<Object>} Parsed infobox data
 */
async function getWikipediaInfobox(pageTitle) {
  try {
    // Get the page HTML
    const url = `${WIKIPEDIA_QUERY_API}?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&origin=*`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.parse?.text?.['*']) {
      return null;
    }
    
    const html = data.parse.text['*'];
    
    // Parse colors from infobox
    const colors = extractColors(html);
    const logo = extractLogo(html, pageTitle);
    
    return {
      colors,
      logo,
      pageTitle
    };
  } catch (error) {
    console.error('Wikipedia infobox error:', error);
    return null;
  }
}

/**
 * Extract colors from Wikipedia HTML
 * @param {string} html 
 * @returns {Object} { primary, secondary }
 */
function extractColors(html) {
  const colors = { primary: null, secondary: null };
  
  // Look for colors in the infobox - find the Colors row
  // Pattern: <th>Colors</th><td>...color data...</td>
  const colorRowPatterns = [
    /Colors<\/a><\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi,
    /Colors<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi,
    /colors?<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi,
    /school\s*colors?<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi,
    /athletics\s*colors?<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi,
  ];
  
  let colorCell = '';
  for (const pattern of colorRowPatterns) {
    const match = pattern.exec(html);
    if (match) {
      colorCell = match[1];
      console.log('🎓 [WIKIPEDIA] Found color cell:', colorCell.substring(0, 200));
      break;
    }
  }
  
  if (colorCell) {
    // Method 1: Look for background-color in legend-color spans (most common Wikipedia format)
    // Pattern: <span class="legend-color" style="...background-color:#3E8EDE;...">
    const bgColorMatches = colorCell.matchAll(/background-color:\s*([#\w]+)/gi);
    const bgColors = [];
    for (const match of bgColorMatches) {
      const color = match[1];
      // Skip transparent or inherit values
      if (color && !color.includes('transparent') && !color.includes('inherit')) {
        bgColors.push(color.toUpperCase());
      }
    }
    
    console.log('🎓 [WIKIPEDIA] Background colors found:', bgColors);
    
    if (bgColors.length > 0) {
      colors.primary = bgColors[0];
      if (bgColors.length > 1) {
        colors.secondary = bgColors[1];
      }
    }
    
    // Method 2: Look for hex colors directly in the text (fallback)
    if (!colors.primary) {
      const hexMatches = colorCell.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
      if (hexMatches && hexMatches.length > 0) {
        // Filter out common non-color hex values
        const validColors = hexMatches.filter(c => 
          !['#000000', '#FFFFFF', '#ffffff', '#000'].includes(c) || hexMatches.length <= 2
        );
        if (validColors.length > 0) {
          colors.primary = validColors[0].toUpperCase();
          if (validColors.length > 1) {
            colors.secondary = validColors[1].toUpperCase();
          }
        }
      }
    }
    
    // Method 3: Try to extract color names (last resort)
    if (!colors.primary) {
      const plainText = colorCell.replace(/<[^>]+>/g, ' ').toLowerCase();
      
      for (const [colorName, hex] of Object.entries(COLOR_NAME_TO_HEX)) {
        if (plainText.includes(colorName)) {
          if (!colors.primary) {
            colors.primary = hex;
          } else if (!colors.secondary && hex !== colors.primary) {
            colors.secondary = hex;
            break;
          }
        }
      }
    }
  }
  
  // Set white as secondary if we only found one color
  if (colors.primary && !colors.secondary) {
    colors.secondary = '#FFFFFF';
  }
  
  console.log('🎓 [WIKIPEDIA] Final extracted colors:', colors);
  
  return colors;
}

/**
 * Extract logo URL from Wikipedia HTML
 * @param {string} html 
 * @param {string} pageTitle 
 * @returns {string|null} Logo URL
 */
function extractLogo(html, pageTitle) {
  // Look for logo in infobox image
  // Pattern: Find images in the infobox that contain "logo", "seal", or "crest"
  const logoPatterns = [
    /src="([^"]*(?:logo|seal|crest|emblem|shield)[^"]*\.(?:png|svg|jpg|jpeg)[^"]*)"/gi,
    /<img[^>]*class="[^"]*infobox[^"]*"[^>]*src="([^"]+)"/gi,
  ];
  
  // First try to find explicit logo/seal images
  for (const pattern of logoPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let url = match[1];
      if (url.startsWith('//')) {
        url = 'https:' + url;
      }
      // Prefer SVG logos
      if (url.includes('.svg') || url.toLowerCase().includes('logo') || url.toLowerCase().includes('seal')) {
        return url;
      }
    }
  }
  
  // Fallback: Look for any image in the infobox
  const infoboxImageMatch = /<td[^>]*class="[^"]*infobox-image[^"]*"[^>]*>[\s\S]*?src="([^"]+)"/gi.exec(html);
  if (infoboxImageMatch) {
    let url = infoboxImageMatch[1];
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    return url;
  }
  
  return null;
}

/**
 * Fetch university branding from Wikipedia
 * @param {string} universityName - Name of the university (e.g., "Dartmouth College")
 * @returns {Promise<Object>} { primaryColor, secondaryColor, logoUrl }
 */
export async function fetchUniversityBranding(universityName) {
  console.log('🎓 [WIKIPEDIA] Fetching branding for:', universityName);
  
  try {
    // Search for the Wikipedia page
    const pageTitle = await searchWikipedia(universityName);
    if (!pageTitle) {
      console.warn('🎓 [WIKIPEDIA] No Wikipedia page found for:', universityName);
      return { primaryColor: null, secondaryColor: null, logoUrl: null };
    }
    
    console.log('🎓 [WIKIPEDIA] Found page:', pageTitle);
    
    // Get infobox data
    const infobox = await getWikipediaInfobox(pageTitle);
    if (!infobox) {
      console.warn('🎓 [WIKIPEDIA] Could not parse infobox for:', pageTitle);
      return { primaryColor: null, secondaryColor: null, logoUrl: null };
    }
    
    console.log('🎓 [WIKIPEDIA] Extracted branding:', {
      primaryColor: infobox.colors.primary,
      secondaryColor: infobox.colors.secondary,
      logoUrl: infobox.logo ? 'Found' : 'Not found'
    });
    
    return {
      primaryColor: infobox.colors.primary,
      secondaryColor: infobox.colors.secondary,
      logoUrl: infobox.logo
    };
  } catch (error) {
    console.error('🎓 [WIKIPEDIA] Error fetching branding:', error);
    return { primaryColor: null, secondaryColor: null, logoUrl: null };
  }
}

/**
 * Try to get a higher resolution version of a Wikipedia image
 * @param {string} imageUrl 
 * @param {number} width 
 * @returns {string} URL to resized image
 */
export function getWikipediaImageUrl(imageUrl, width = 200) {
  if (!imageUrl) return null;
  
  // Wikipedia thumbnail URLs can be modified to get different sizes
  // Format: .../thumb/X/XX/Filename/WIDTHpx-Filename
  if (imageUrl.includes('/thumb/')) {
    // Replace the width in the URL
    return imageUrl.replace(/\/\d+px-/, `/${width}px-`);
  }
  
  return imageUrl;
}

export default {
  fetchUniversityBranding,
  getWikipediaImageUrl
};
