import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate relative luminance of a hex color
 * Returns a value between 0 (black) and 1 (white)
 */
export function getLuminance(hexColor) {
  if (!hexColor) return 0.5;
  
  // Remove # if present and normalize
  let hex = hexColor.toString().trim().replace('#', '');
  
  // Handle 3-char hex (e.g., "FFF" -> "FFFFFF")
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  // Validate hex length
  if (hex.length !== 6) return 0.5;
  
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Check for NaN (invalid hex)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0.5;
  
  // Apply gamma correction for more accurate perception
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Relative luminance formula
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Determine if a color is "light" or "dark"
 * Returns true if the color is light (should use dark text)
 */
export function isLightColor(hexColor) {
  return getLuminance(hexColor) > 0.4; // Threshold tuned for readability
}

/**
 * Get contrasting text color for a background
 * Returns 'white' or a dark color based on background luminance
 */
export function getContrastTextColor(backgroundColor, darkColor = '#1f2937') {
  if (!backgroundColor) return darkColor;
  return isLightColor(backgroundColor) ? darkColor : 'white';
}
