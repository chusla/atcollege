import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categorizationQueue } from '../categorizationQueue'

const mockCategorizePlace = vi.fn()
const mockGetUncategorizedPlaces = vi.fn()

vi.mock('../../api/llmCategorization', () => ({
  categorizePlace: (...args) => mockCategorizePlace(...args),
  getUncategorizedPlaces: (...args) => mockGetUncategorizedPlaces(...args)
}))

describe('Categorization Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCategorizePlace.mockClear()
    mockGetUncategorizedPlaces.mockClear()
    categorizationQueue.clear()
  })

  describe('enqueue', () => {
    it('should add place to queue', () => {
      categorizationQueue.enqueue('place-1')
      
      const status = categorizationQueue.getStatus()
      expect(status.queueLength).toBe(1)
    })

    it('should not add duplicate places', () => {
      categorizationQueue.enqueue('place-1')
      categorizationQueue.enqueue('place-1')
      
      const status = categorizationQueue.getStatus()
      expect(status.queueLength).toBe(1)
    })
  })

  describe('enqueueBatch', () => {
    it('should add multiple places to queue', () => {
      categorizationQueue.enqueueBatch(['place-1', 'place-2', 'place-3'])
      
      const status = categorizationQueue.getStatus()
      expect(status.queueLength).toBe(3)
    })

    it('should not add duplicates', () => {
      categorizationQueue.enqueue('place-1')
      categorizationQueue.enqueueBatch(['place-1', 'place-2'])
      
      const status = categorizationQueue.getStatus()
      expect(status.queueLength).toBe(2)
    })
  })

  describe('process', () => {
    it('should process queue items', async () => {
      mockCategorizePlace.mockResolvedValue({ success: true })
      
      categorizationQueue.enqueue('place-1')
      categorizationQueue.enqueue('place-2')
      
      await categorizationQueue.process()
      
      expect(mockCategorizePlace).toHaveBeenCalledTimes(2)
      const status = categorizationQueue.getStatus()
      expect(status.queueLength).toBe(0)
      expect(status.processing).toBe(false)
    })

    it('should handle processing errors gracefully', async () => {
      mockCategorizePlace.mockRejectedValue(new Error('Processing failed'))
      
      categorizationQueue.enqueue('place-1')
      
      await categorizationQueue.process()
      
      expect(mockCategorizePlace).toHaveBeenCalled()
      const status = categorizationQueue.getStatus()
      expect(status.processing).toBe(false)
    })

    it('should not process if already processing', async () => {
      mockCategorizePlace.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      categorizationQueue.enqueue('place-1')
      
      const promise1 = categorizationQueue.process()
      const promise2 = categorizationQueue.process()
      
      await Promise.all([promise1, promise2])
      
      // Should only process once
      expect(mockCategorizePlace).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadUncategorized', () => {
    it('should load uncategorized places into queue', async () => {
      mockGetUncategorizedPlaces.mockResolvedValue([
        { id: 'place-1' },
        { id: 'place-2' }
      ])
      
      const count = await categorizationQueue.loadUncategorized(20)
      
      expect(count).toBe(2)
      const status = categorizationQueue.getStatus()
      expect(status.queueLength).toBe(2)
    })
  })

  describe('subscribe', () => {
    it('should notify listeners on queue changes', () => {
      const listener = vi.fn()
      categorizationQueue.subscribe(listener)
      
      categorizationQueue.enqueue('place-1')
      
      expect(listener).toHaveBeenCalled()
    })

    it('should allow unsubscribing', () => {
      const listener = vi.fn()
      const unsubscribe = categorizationQueue.subscribe(listener)
      
      unsubscribe()
      categorizationQueue.enqueue('place-1')
      
      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled()
    })
  })
})

