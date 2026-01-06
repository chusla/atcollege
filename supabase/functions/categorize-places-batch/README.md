# Batch Categorize Places Edge Function

This edge function categorizes multiple places at once using Anthropic Claude API, making it more efficient than individual calls.

## Deployment

**Important**: Deploy with `--no-verify-jwt` flag to allow unauthenticated access:

```bash
supabase functions deploy categorize-places-batch --no-verify-jwt
```

Or in Supabase Dashboard:
- Go to Edge Functions → categorize-places-batch
- Enable "Skip JWT Verification" option

## Environment Variables

Set in Supabase Dashboard → Edge Functions → categorize-places-batch → Settings:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

## Usage

The function is called automatically by the categorization queue when processing multiple places.

## Request Format

```json
{
  "places": [
    {
      "id": "place-uuid",
      "name": "Place Name",
      "address": "123 Main St",
      "description": "Optional description",
      "google_place_data": {
        "types": ["restaurant", "food"]
      },
      "image_url": "https://..."
    }
  ]
}
```

## Response Format

```json
{
  "success": true,
  "results": [
    {
      "index": 0,
      "placeId": "place-uuid",
      "category": "Restaurants",
      "confidence": 0.95,
      "description": "A friendly description..."
    }
  ]
}
```

## Features

- Processes up to 10 places per batch
- Uses structured JSON output for reliable parsing
- Returns categories, confidence scores, and descriptions
- More efficient than individual API calls

