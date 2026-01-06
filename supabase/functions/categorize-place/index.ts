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
    // Skip JWT verification - this function only calls external APIs and doesn't need auth
    // The anon key is sufficient for access control
    
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

    // Create prompt for Anthropic Claude - also generate a description
    const prompt = `You are helping categorize and describe places for a college campus directory.

Place Name: ${placeName}
Address: ${placeAddress}
Current Description: ${placeDescription || 'None'}
Google Place Types: ${googleTypesStr}

Tasks:
1. Categorize this place. Categories: Bars, Restaurants, Cafes, Gym, Library, Study Spots, Entertainment, Shopping, Housing, Other
2. Generate a brief, friendly description (2-3 sentences) that helps students understand what this place is about.

Return ONLY a JSON object with this exact format (no markdown, no code blocks):
{
  "category": "Restaurants",
  "confidence": 0.95,
  "description": "A brief, friendly 2-3 sentence description of what this place offers and why students might visit it."
}

Example description style: "A popular BBQ spot known for its authentic Texas-style smoked meats and casual atmosphere. Great for groups looking for hearty meals and a laid-back dining experience."`

    // Call Anthropic Claude API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5', // Claude Sonnet 4.5
        max_tokens: 300,
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
    console.log('Raw Claude response:', content.substring(0, 300))
    
    // Parse JSON from response
    let result
    try {
      // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
      let jsonContent = content.trim()
      
      // Remove opening ```json or ``` 
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7)
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3)
      }
      
      // Remove closing ```
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3)
      }
      
      jsonContent = jsonContent.trim()
      console.log('Cleaned JSON content:', jsonContent.substring(0, 200))
      
      // Try direct parsing first
      try {
        result = JSON.parse(jsonContent)
      } catch {
        // Fallback: Extract JSON object from response
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found in response')
        }
      }
      console.log('Successfully parsed result:', result.category)
    } catch (parseError) {
      console.error('Error parsing Claude response:', content)
      console.error('Parse error:', parseError)
      throw new Error('Failed to parse LLM response')
    }

    // Validate result
    if (!result.category) {
      throw new Error('LLM response missing category')
    }

    const confidence = result.confidence ? parseFloat(result.confidence) : 0.5
    const description = result.description || null

    return new Response(
      JSON.stringify({
        success: true,
        category: result.category,
        confidence: confidence,
        description: description
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

