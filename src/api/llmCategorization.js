/**
 * LLM Categorization Service
 * Handles async categorization of places using Anthropic Claude API via Supabase Edge Function
 * The API key is kept secure on the server side
 */

import { Place } from './entities';
import { supabase } from './supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Categorize a place using LLM
 * @param {string} placeId - Place ID from database
 * @returns {Promise<Object>} Categorization result
 */
export async function categorizePlace(placeId) {
  try {
    // Update status to processing
    await Place.updateCategorizationStatus(placeId, 'processing');

    // Get place data
    const place = await Place.get(placeId);
    if (!place) {
      throw new Error('Place not found');
    }

    if (!SUPABASE_URL) {
      throw new Error('Supabase URL not configured');
    }

    // Prepare data for LLM
    const placeData = {
      name: place.name,
      address: place.address,
      description: place.description,
      google_place_data: place.google_place_data,
      types: place.google_place_data?.types || []
    };

    // Call Supabase Edge Function (which calls Anthropic API server-side)
    // Use anon key as bearer token to bypass JWT verification
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const { data: result, error } = await supabase.functions.invoke('categorize-place', {
      body: { placeData },
      headers: {
        Authorization: `Bearer ${anonKey}`
      }
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!result || !result.success) {
      throw new Error(result?.error || 'Categorization failed');
    }

    const confidence = result.confidence ? parseFloat(result.confidence) : 0.5;
    const description = result.description || null;

    // Update place with categorization results and description
    const updateData = {};
    if (description && !place.description) {
      updateData.description = description;
    }
    if (confidence > 0.8 && result.category) {
      updateData.category = mapLLMCategoryToSchema(result.category);
    }

    // Update categorization status
    await Place.updateCategorizationStatus(
      placeId,
      'completed',
      result.category,
      confidence
    );

    // Update place with category and description if available
    if (Object.keys(updateData).length > 0) {
      await Place.update(placeId, updateData);
    }

    return {
      success: true,
      category: result.category,
      confidence: confidence
    };
  } catch (error) {
    console.error('Error categorizing place:', error);
    
    // Update status to failed
    try {
      await Place.updateCategorizationStatus(placeId, 'failed');
    } catch (updateError) {
      console.error('Error updating categorization status:', updateError);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Map LLM category to schema category
 */
function mapLLMCategoryToSchema(llmCategory) {
  // Allowed categories: 'Bars', 'Restaurants', 'Cafes', 'Housing', 'Study Spots', 'Entertainment', 'Shopping', 'Other'
  const categoryMap = {
    'bar': 'Bars',
    'bars': 'Bars',
    'restaurant': 'Restaurants',
    'restaurants': 'Restaurants',
    'cafe': 'Cafes',
    'cafes': 'Cafes',
    'coffee': 'Cafes',
    'coffee shop': 'Cafes',
    'gym': 'Other', // Gym not in allowed list, map to Other
    'fitness': 'Other', // Fitness not in allowed list, map to Other
    'library': 'Study Spots', // Library maps to Study Spots
    'study spot': 'Study Spots',
    'study spots': 'Study Spots',
    'study': 'Study Spots',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping',
    'housing': 'Housing',
    'food': 'Restaurants',
    'dining': 'Restaurants',
    'store': 'Shopping',
    'retail': 'Shopping'
  };

  const normalized = llmCategory?.toLowerCase().trim();
  const mapped = categoryMap[normalized];
  
  // Validate the mapped category is in the allowed list
  const allowedCategories = ['Bars', 'Restaurants', 'Cafes', 'Housing', 'Study Spots', 'Entertainment', 'Shopping', 'Other'];
  if (mapped && allowedCategories.includes(mapped)) {
    return mapped;
  }
  
  // Fallback to 'Other' if mapping is invalid
  console.warn(`Invalid category mapping: ${llmCategory} -> ${mapped}, using 'Other'`);
  return 'Other';
}

/**
 * Batch categorize multiple places using batch endpoint
 * More efficient than individual calls
 */
export async function categorizePlacesBatch(placeIds) {
  try {
    if (!placeIds || placeIds.length === 0) {
      return [];
    }

    // Get full place data for all places
    const places = await Promise.all(
      placeIds.map(async (id) => {
        const place = await Place.get(id);
        if (!place) return null;
        
        // Update status to processing
        await Place.updateCategorizationStatus(id, 'processing');
        
        return {
          id: place.id,
          name: place.name,
          address: place.address,
          description: place.description,
          google_place_data: place.google_place_data,
          image_url: place.image_url
        };
      })
    );

    // Filter out nulls
    const validPlaces = places.filter(p => p !== null);
    
    if (validPlaces.length === 0) {
      return [];
    }

    // Call batch categorization endpoint
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const { data: result, error } = await supabase.functions.invoke('categorize-places-batch', {
      body: { places: validPlaces },
      headers: {
        Authorization: `Bearer ${anonKey}`
      }
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!result || !result.success) {
      throw new Error(result?.error || 'Batch categorization failed');
    }

    // Process results and update places
    const updatePromises = result.results.map(async (categorized) => {
      const { placeId, category, confidence, description } = categorized;
      
      const updateData = {};
      if (description) {
        updateData.description = description;
      }
      if (confidence > 0.7 && category) {
        updateData.category = mapLLMCategoryToSchema(category);
      }

      // Update categorization status
      await Place.updateCategorizationStatus(
        placeId,
        'completed',
        category,
        confidence
      );

      // Update place with category and description
      if (Object.keys(updateData).length > 0) {
        await Place.update(placeId, updateData);
      }

      return {
        placeId,
        success: true,
        category,
        confidence
      };
    });

    const results = await Promise.allSettled(updatePromises);
    return results;
  } catch (error) {
    console.error('Error in batch categorization:', error);
    
    // Mark all as failed
    await Promise.allSettled(
      placeIds.map(id => Place.updateCategorizationStatus(id, 'failed'))
    );
    
    return placeIds.map(id => ({
      status: 'rejected',
      reason: error.message
    }));
  }
}

/**
 * Get places that need categorization
 */
export async function getUncategorizedPlaces(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('places')
      .select('id')
      .eq('source', 'google_maps')
      .in('categorization_status', ['pending', 'failed'])
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting uncategorized places:', error);
    return [];
  }
}

