# Categorize Place Edge Function

This Supabase Edge Function handles place categorization using Anthropic Claude API, keeping the API key secure on the server side.

## Setup

1. **Deploy the function:**
   ```bash
   supabase functions deploy categorize-place
   ```

2. **Set the environment variable in Supabase Dashboard:**
   - Go to Project Settings > Edge Functions
   - Add secret: `ANTHROPIC_API_KEY` with your Anthropic API key value
   - Or use CLI: `supabase secrets set ANTHROPIC_API_KEY=your_key_here`

3. **Remove client-side API key:**
   - Remove `VITE_ANTHROPIC_API_KEY` from your `.env` file
   - It's no longer needed since the API key is stored server-side

## Usage

The function is automatically called by the client-side `categorizePlace()` function in `src/api/llmCategorization.js`.

## Security

- ✅ API key is stored server-side only
- ✅ Client never sees the Anthropic API key
- ✅ Function validates input and handles errors gracefully

