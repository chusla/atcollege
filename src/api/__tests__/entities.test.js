import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Place } from '../entities'
import { supabase } from '../supabaseClient'

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    }))
  }
}))

describe('Place Entity - Google Places Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findByGooglePlaceId', () => {
    it('should find place by Google Place ID', async () => {
      const mockPlace = {
        id: 'place-123',
        google_place_id: 'google-place-456',
        name: 'Test Place'
      }

      supabase.from().maybeSingle.mockResolvedValue({
        data: mockPlace,
        error: null
      })

      const result = await Place.findByGooglePlaceId('google-place-456')

      expect(result).toEqual(mockPlace)
      expect(supabase.from).toHaveBeenCalledWith('places')
      expect(supabase.from().eq).toHaveBeenCalledWith('google_place_id', 'google-place-456')
    })

    it('should return null when place not found', async () => {
      supabase.from().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await Place.findByGooglePlaceId('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createFromGooglePlace', () => {
    it('should create place from Google Place data', async () => {
      const googlePlaceData = {
        google_place_id: 'google-123',
        name: 'New Place',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.0060,
        rating: 4.5,
        raw_data: { types: ['restaurant'] }
      }

      const mockCreated = {
        id: 'new-place-id',
        ...googlePlaceData,
        source: 'google_maps',
        status: 'pending'
      }

      supabase.from().single.mockResolvedValue({
        data: mockCreated,
        error: null
      })

      const result = await Place.createFromGooglePlace(googlePlaceData, 'campus-123')

      expect(result).toEqual(mockCreated)
      expect(supabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Place',
          google_place_id: 'google-123',
          source: 'google_maps',
          status: 'pending',
          campus_id: 'campus-123'
        })
      )
    })

    it('should handle errors during creation', async () => {
      const googlePlaceData = {
        google_place_id: 'google-123',
        name: 'New Place'
      }

      supabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' }
      })

      await expect(
        Place.createFromGooglePlace(googlePlaceData)
      ).rejects.toThrow()
    })
  })

  describe('updateCategorizationStatus', () => {
    it('should update categorization status', async () => {
      const mockUpdated = {
        id: 'place-123',
        categorization_status: 'completed',
        llm_category: 'Restaurants',
        llm_category_confidence: 0.95
      }

      supabase.from().single.mockResolvedValue({
        data: mockUpdated,
        error: null
      })

      const result = await Place.updateCategorizationStatus(
        'place-123',
        'completed',
        'Restaurants',
        0.95
      )

      expect(result).toEqual(mockUpdated)
      expect(supabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          categorization_status: 'completed',
          llm_category: 'Restaurants',
          llm_category_confidence: 0.95
        })
      )
    })

    it('should update status without category if not provided', async () => {
      supabase.from().single.mockResolvedValue({
        data: { id: 'place-123', categorization_status: 'processing' },
        error: null
      })

      await Place.updateCategorizationStatus('place-123', 'processing')

      expect(supabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          categorization_status: 'processing'
        })
      )
    })
  })
})

