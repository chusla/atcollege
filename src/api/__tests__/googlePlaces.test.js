import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchPlaces, searchNearby, getPlaceDetails, categoryToGoogleType, milesToMeters } from '../googlePlaces'

// Mock fetch globally
global.fetch = vi.fn()

describe('Google Places API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear cache between tests
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchPlaces', () => {
    it('should return empty array when API key is not configured', async () => {
      vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '')
      
      const result = await searchPlaces('coffee', { lat: 40.7128, lng: -74.0060 })
      
      expect(result).toEqual([])
    })

    it('should search places successfully', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            place_id: 'test-place-1',
            name: 'Test Coffee Shop',
            formatted_address: '123 Test St',
            geometry: { location: { lat: () => 40.7128, lng: () => -74.0060 } },
            rating: 4.5,
            user_ratings_total: 100,
            types: ['cafe', 'establishment'],
            photos: [{ photo_reference: 'photo-ref-1' }]
          }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await searchPlaces('coffee', { lat: 40.7128, lng: -74.0060 }, 5000)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        google_place_id: 'test-place-1',
        name: 'Test Coffee Shop',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
        rating: 4.5
      })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('textsearch'),
        expect.any(Object)
      )
    })

    it('should handle API errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'REQUEST_DENIED', error_message: 'Invalid API key' })
      })

      await expect(searchPlaces('coffee', { lat: 40.7128, lng: -74.0060 })).rejects.toThrow()
    })

    it('should cache results', async () => {
      const mockResponse = {
        status: 'OK',
        results: []
      }

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      // First call
      await searchPlaces('coffee', { lat: 40.7128, lng: -74.0060 })
      // Second call (should use cache)
      await searchPlaces('coffee', { lat: 40.7128, lng: -74.0060 })

      // Should only call fetch once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('searchNearby', () => {
    it('should return empty array when location is missing', async () => {
      const result = await searchNearby(null, 5000, 'bar')
      expect(result).toEqual([])
    })

    it('should search nearby places by type', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            place_id: 'bar-1',
            name: 'Test Bar',
            formatted_address: '456 Bar St',
            geometry: { location: { lat: () => 40.7128, lng: () => -74.0060 } },
            rating: 4.0,
            types: ['bar', 'establishment']
          }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await searchNearby({ lat: 40.7128, lng: -74.0060 }, 5000, 'bar')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Bar')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nearbysearch'),
        expect.any(Object)
      )
    })
  })

  describe('getPlaceDetails', () => {
    it('should fetch place details', async () => {
      const mockResponse = {
        status: 'OK',
        result: {
          place_id: 'place-123',
          name: 'Detailed Place',
          formatted_address: '789 Detail Ave',
          geometry: { location: { lat: () => 40.7128, lng: () => -74.0060 } },
          rating: 4.8,
          user_ratings_total: 250,
          types: ['restaurant'],
          international_phone_number: '+1234567890',
          website: 'https://example.com',
          photos: []
        }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getPlaceDetails('place-123')

      expect(result).toMatchObject({
        google_place_id: 'place-123',
        name: 'Detailed Place',
        address: '789 Detail Ave',
        rating: 4.8,
        phone: '+1234567890',
        website: 'https://example.com'
      })
    })

    it('should return null when place not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS' })
      })

      const result = await getPlaceDetails('invalid-id')
      expect(result).toBeNull()
    })
  })

  describe('categoryToGoogleType', () => {
    it('should map categories to Google Places types', () => {
      expect(categoryToGoogleType('bars')).toBe('bar')
      expect(categoryToGoogleType('restaurants')).toBe('restaurant')
      expect(categoryToGoogleType('cafes')).toBe('cafe')
      expect(categoryToGoogleType('gym')).toBe('gym')
      expect(categoryToGoogleType('library')).toBe('library')
      expect(categoryToGoogleType('study_spot')).toBe('library')
    })

    it('should return null for unknown categories', () => {
      expect(categoryToGoogleType('unknown')).toBeNull()
      expect(categoryToGoogleType(null)).toBeNull()
    })
  })

  describe('milesToMeters', () => {
    it('should convert miles to meters correctly', () => {
      expect(milesToMeters(1)).toBeCloseTo(1609.34, 2)
      expect(milesToMeters(5)).toBeCloseTo(8046.7, 1)
      expect(milesToMeters(10)).toBeCloseTo(16093.4, 1)
    })
  })
})

