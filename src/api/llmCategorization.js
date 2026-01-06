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

    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call Supabase Edge Function (which calls Anthropic API server-side)
    const { data: result, error } = await supabase.functions.invoke('categorize-place', {
      body: { placeData },
      headers: session ? {
        Authorization: `Bearer ${session.access_token}`
      } : {}
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
  const categoryMap = {
    'bar': 'Bars',
    'bars': 'Bars',
    'restaurant': 'Restaurants',
    'restaurants': 'Restaurants',
    'cafe': 'Cafes',
    'cafes': 'Cafes',
    'coffee': 'Cafes',
    'gym': 'Gym',
    'fitness': 'Gym',
    'library': 'Library',
    'study spot': 'Study Spots',
    'study': 'Study Spots',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping',
    'housing': 'Housing'
  };

  const normalized = llmCategory?.toLowerCase().trim();
  return categoryMap[normalized] || 'Other';
}

/**
 * Batch categorize multiple places
 */
export async function categorizePlacesBatch(placeIds) {
  const results = [];
  
  // Process in batches of 5 to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < placeIds.length; i += batchSize) {
    const batch = placeIds.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(placeId => categorizePlace(placeId))
    );
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < placeIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
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

