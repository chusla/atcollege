// Supabase Edge Function to categorize places using Anthropic Claude API
// This keeps the API key secure on the server side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const { placeData } = await req.json()

    if (!placeData) {
      throw new Error('placeData is required')
    }

    const placeName = placeData.name || 'Unknown'
    const placeAddress = placeData.address || ''
    const placeDescription = placeData.description || ''
    const googleTypes = placeData.google_place_data?.types || []
    const googleTypesStr = googleTypes.slice(0, 5).join(', ')

    // Create prompt for Anthropic Claude
    const prompt = `Categorize this place for a college campus directory. Return ONLY a JSON object with "category" and "confidence" (0.0 to 1.0) fields.

Place Name: ${placeName}
Address: ${placeAddress}
Description: ${placeDescription}
Google Place Types: ${googleTypesStr}

Categories to choose from: Bars, Restaurants, Cafes, Gym, Library, Study Spots, Entertainment, Shopping, Housing, Other

Return JSON format: {"category": "Restaurants", "confidence": 0.95}`

    // Call Anthropic Claude API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Anthropic API error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    
    // Extract content from Claude's response
    const content = data.content?.[0]?.text || ''
    
    // Parse JSON from response
    let result
    try {
      // Extract JSON from response (handle cases where response includes markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', content)
      throw new Error('Failed to parse LLM response')
    }

    // Validate result
    if (!result.category) {
      throw new Error('LLM response missing category')
    }

    const confidence = result.confidence ? parseFloat(result.confidence) : 0.5

    return new Response(
      JSON.stringify({
        success: true,
        category: result.category,
        confidence: confidence
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in categorize-place function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      }
    )
  }
})

