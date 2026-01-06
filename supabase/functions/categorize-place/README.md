# Categorize Place Edge Function

This edge function categorizes places using Anthropic Claude API and generates descriptions.

## Deployment

**Important**: Deploy with `--no-verify-jwt` flag to allow unauthenticated access:

```bash
supabase functions deploy categorize-place --no-verify-jwt
```

Or in Supabase Dashboard:
- Go to Edge Functions → categorize-place
- Enable "Skip JWT Verification" option

## Environment Variables

Set in Supabase Dashboard → Edge Functions → categorize-place → Settings:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

## Usage

The function is called automatically when new places are imported from Google Places API.

## Why No JWT Verification?

This function only calls external APIs (Anthropic) and doesn't access the database, so it doesn't need user authentication. Using the anon key is sufficient for access control.
