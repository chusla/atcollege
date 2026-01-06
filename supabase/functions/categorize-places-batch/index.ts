// Supabase Edge Function to batch categorize places using Anthropic Claude API
// Processes multiple places at once for efficiency

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is missing from environment variables')
      throw new Error('ANTHROPIC_API_KEY not configured. Please set it in Supabase Dashboard → Edge Functions → categorize-places-batch → Settings')
    }

    const body = await req.json().catch(() => ({}))
    const { places } = body
    
    console.log('Received request with', places?.length || 0, 'places')

    if (!places || !Array.isArray(places) || places.length === 0) {
      throw new Error('places array is required')
    }

    // Limit batch size to avoid token limits
    const batchSize = Math.min(places.length, 10)
    const placesToProcess = places.slice(0, batchSize)

    // Create prompt for batch categorization
    const placesList = placesToProcess.map((p, idx) => {
      const name = p.name || 'Unknown'
      const address = p.address || ''
      const description = p.description || ''
      const googleTypes = p.google_place_data?.types || []
      const googleTypesStr = googleTypes.slice(0, 5).join(', ')
      
      return `${idx + 1}. Name: ${name}
   Address: ${address}
   Description: ${description || 'None'}
   Google Types: ${googleTypesStr}`
    }).join('\n\n')

    const prompt = `You are helping categorize places for a college campus directory. 

Categorize each place below. For each place, return:
1. Category (one of: Bars, Restaurants, Cafes, Gym, Library, Study Spots, Entertainment, Shopping, Housing, Other)
2. Confidence (0.0 to 1.0)
3. Description (2-3 sentences, friendly and helpful for students)

Places to categorize:
${placesList}

Return ONLY a JSON object with a "results" key containing an array with this exact format:
{
  "results": [
    {
      "index": 1,
      "category": "Restaurants",
      "confidence": 0.95,
      "description": "A brief, friendly 2-3 sentence description."
    },
    {
      "index": 2,
      "category": "Cafes",
      "confidence": 0.90,
      "description": "Another description..."
    }
  ]
}

The results array must have exactly ${placesToProcess.length} items, one for each place in order.`

    // Call Anthropic Claude API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929', // Latest Claude Sonnet 4.5 model
        max_tokens: 2000, // More tokens for batch processing
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
    let results
    try {
      // Try parsing as direct JSON first
      const parsed = JSON.parse(content)
      
      // Handle both direct array and object with results key
      if (Array.isArray(parsed)) {
        results = parsed
      } else if (parsed.results && Array.isArray(parsed.results)) {
        results = parsed.results
      } else if (parsed.places && Array.isArray(parsed.places)) {
        results = parsed.places
      } else {
        // Fallback: try to extract array from content
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          results = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON array found in response')
        }
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', content)
      console.error('Parse error:', parseError)
      throw new Error('Failed to parse LLM response')
    }

    // Validate results
    if (!Array.isArray(results) || results.length !== placesToProcess.length) {
      throw new Error(`Expected ${placesToProcess.length} results, got ${results.length}`)
    }

    // Map results back to places
    const categorizedPlaces = results.map((result, idx) => {
      if (!result.category) {
        throw new Error(`Result ${idx + 1} missing category`)
      }
      
      return {
        index: idx,
        placeId: placesToProcess[idx].id,
        category: result.category,
        confidence: result.confidence ? parseFloat(result.confidence) : 0.5,
        description: result.description || null
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        results: categorizedPlaces
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
    console.error('Error in categorize-places-batch function:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      hasApiKey: !!ANTHROPIC_API_KEY
    })
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: process.env.DENO_ENV === 'development' ? error.stack : undefined
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

