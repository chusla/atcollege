// Test setup file
import { vi } from 'vitest'

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-google-key')

// Mock window.google for Google Maps tests
global.window = {
  ...global.window,
  google: {
    maps: {
      places: {
        Autocomplete: vi.fn(),
      },
      event: {
        clearInstanceListeners: vi.fn(),
      },
    },
  },
}

