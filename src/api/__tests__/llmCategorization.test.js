import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categorizePlace, getUncategorizedPlaces, categorizePlacesBatch } from '../llmCategorization'
import { Place } from '../entities'
import { supabase } from '../supabaseClient'

// Mock dependencies
vi.mock('../entities', () => ({
  Place: {
    updateCategorizationStatus: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
  }
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            limit: vi.fn(() => ({
              then: vi.fn((callback) => callback({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}))

describe('LLM Categorization Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('categorizePlace', () => {
    it('should successfully categorize a place', async () => {
      const mockPlace = {
        id: 'place-123',
        name: 'Test Restaurant',
        address: '123 Main St',
        description: 'A great restaurant',
        google_place_data: {
          types: ['restaurant', 'food', 'establishment']
        }
      }

      Place.get.mockResolvedValue(mockPlace)
      Place.updateCategorizationStatus.mockResolvedValue(mockPlace)
      Place.update.mockResolvedValue(mockPlace)

      supabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          category: 'Restaurants',
          confidence: 0.95
        },
        error: null
      })

      const result = await categorizePlace('place-123')

      expect(result.success).toBe(true)
      expect(result.category).toBe('Restaurants')
      expect(result.confidence).toBe(0.95)
      expect(Place.updateCategorizationStatus).toHaveBeenCalledWith(
        'place-123',
        'processing'
      )
      expect(Place.updateCategorizationStatus).toHaveBeenCalledWith(
        'place-123',
        'completed',
        'Restaurants',
        0.95
      )
      expect(Place.update).toHaveBeenCalledWith('place-123', {
        category: 'Restaurants'
      })
    })

    it('should handle place not found', async () => {
      Place.get.mockResolvedValue(null)

      const result = await categorizePlace('invalid-id')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Place not found')
    })

    it('should handle Edge Function errors', async () => {
      const mockPlace = {
        id: 'place-123',
        name: 'Test Place',
        address: '123 Main St'
      }

      Place.get.mockResolvedValue(mockPlace)
      Place.updateCategorizationStatus.mockResolvedValue(mockPlace)

      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' }
      })

      const result = await categorizePlace('place-123')

      expect(result.success).toBe(false)
      expect(Place.updateCategorizationStatus).toHaveBeenCalledWith(
        'place-123',
        'failed'
      )
    })

    it('should handle low confidence scores', async () => {
      const mockPlace = {
        id: 'place-123',
        name: 'Test Place',
        address: '123 Main St'
      }

      Place.get.mockResolvedValue(mockPlace)
      Place.updateCategorizationStatus.mockResolvedValue(mockPlace)

      supabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          category: 'Other',
          confidence: 0.5
        },
        error: null
      })

      const result = await categorizePlace('place-123')

      expect(result.success).toBe(true)
      expect(result.confidence).toBe(0.5)
      // Should not update category field when confidence is low
      expect(Place.update).not.toHaveBeenCalled()
    })
  })

  describe('getUncategorizedPlaces', () => {
    it('should fetch uncategorized places', async () => {
      const mockData = [
        { id: 'place-1' },
        { id: 'place-2' }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null })
      })

      const result = await getUncategorizedPlaces(20)

      expect(result).toEqual(mockData)
    })

    it('should return empty array on error', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
      })

      const result = await getUncategorizedPlaces(20)

      expect(result).toEqual([])
    })
  })

  describe('categorizePlacesBatch', () => {
    it('should process multiple places in batches', async () => {
      const placeIds = ['place-1', 'place-2', 'place-3', 'place-4', 'place-5', 'place-6']
      
      const mockPlace = { id: 'place-1', name: 'Test' }
      Place.get.mockResolvedValue(mockPlace)
      Place.updateCategorizationStatus.mockResolvedValue(mockPlace)

      supabase.functions.invoke.mockResolvedValue({
        data: { success: true, category: 'Restaurants', confidence: 0.9 },
        error: null
      })

      const results = await categorizePlacesBatch(placeIds)

      expect(results).toHaveLength(placeIds.length)
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(placeIds.length)
    })
  })
})

