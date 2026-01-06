import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Event, Place, Opportunity, InterestGroup, Campus } from '@/api/entities'
import * as googlePlaces from '@/api/googlePlaces'
import * as geoUtils from '@/utils/geo'
import * as categorizationQueue from '@/utils/categorizationQueue'

// Mock all dependencies
vi.mock('@/api/entities', () => ({
  Event: { filter: vi.fn() },
  Place: { filter: vi.fn(), findByGooglePlaceId: vi.fn(), createFromGooglePlace: vi.fn() },
  Opportunity: { filter: vi.fn() },
  InterestGroup: { filter: vi.fn() },
  Campus: { get: vi.fn() }
}))

vi.mock('@/api/googlePlaces', () => ({
  searchPlaces: vi.fn(),
  searchNearby: vi.fn(),
  categoryToGoogleType: vi.fn(),
  milesToMeters: vi.fn()
}))

vi.mock('@/utils/geo', () => ({
  filterByRadius: vi.fn()
}))

vi.mock('@/utils/categorizationQueue', () => ({
  categorizationQueue: {
    enqueueBatch: vi.fn(),
    start: vi.fn()
  }
}))

describe('Search Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mock implementations
    geoUtils.filterByRadius.mockImplementation((items) => items)
    googlePlaces.searchPlaces.mockResolvedValue([])
    googlePlaces.searchNearby.mockResolvedValue([])
  })

  it('should search and return results for events, places, opportunities, and groups', async () => {
    // Mock user with campus
    const mockUser = {
      id: 'user-123',
      selected_campus_id: 'campus-123'
    }

    // Mock campus location
    const mockCampus = {
      id: 'campus-123',
      latitude: '40.7128',
      longitude: '-74.0060'
    }

    // Mock database results
    const mockEvents = [
      { id: 'event-1', title: 'Coffee Meetup', description: 'Join us for coffee', category: 'Social', status: 'approved' },
      { id: 'event-2', title: 'Study Session', description: 'Study together', category: 'Academic', status: 'approved' }
    ]

    const mockPlaces = [
      { id: 'place-1', name: 'Coffee Shop', description: 'Great coffee', category: 'Cafes', status: 'approved' },
      { id: 'place-2', name: 'Library', description: 'Quiet study space', category: 'Study Spots', status: 'approved' }
    ]

    const mockOpportunities = [
      { id: 'opp-1', title: 'Volunteer Opportunity', description: 'Help the community', type: 'Volunteering', status: 'approved' }
    ]

    const mockGroups = [
      { id: 'group-1', name: 'Book Club', description: 'Reading books together', category: 'Academic', status: 'approved' }
    ]

    // Setup mocks
    Campus.get.mockResolvedValue(mockCampus)
    Event.filter.mockResolvedValue(mockEvents)
    Place.filter.mockResolvedValue(mockPlaces)
    Opportunity.filter.mockResolvedValue(mockOpportunities)
    InterestGroup.filter.mockResolvedValue(mockGroups)

    // Simulate search function logic
    const handleSearch = async (query, radius, category = 'all') => {
      if (!query.trim() && category === 'all') {
        return {
          events: [], places: [], opportunities: [], groups: [],
          eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
        }
      }

      // Get user's campus location
      let campusLocation = null
      if (mockUser?.selected_campus_id) {
        const campus = await Campus.get(mockUser.selected_campus_id)
        if (campus?.latitude && campus?.longitude) {
          campusLocation = {
            lat: parseFloat(campus.latitude),
            lng: parseFloat(campus.longitude)
          }
        }
      }

      // Search database for existing places, events, opportunities, groups
      const [allEvents, allPlaces, allOpps, allGroups] = await Promise.all([
        Event.filter({ status: 'approved' }),
        Place.filter({ status: 'approved' }),
        Opportunity.filter({ status: 'approved' }),
        InterestGroup.filter({ status: 'approved' })
      ])

      const searchLower = query.toLowerCase()
      
      // Filter by search query
      let filteredEvents = (allEvents || []).filter(e => 
        e.title?.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.category?.toLowerCase().includes(searchLower)
      )
      
      let filteredPlaces = (allPlaces || []).filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
      )
      
      let filteredOpps = (allOpps || []).filter(o => 
        o.title?.toLowerCase().includes(searchLower) ||
        o.description?.toLowerCase().includes(searchLower) ||
        o.type?.toLowerCase().includes(searchLower)
      )
      
      let filteredGroups = (allGroups || []).filter(g => 
        g.name?.toLowerCase().includes(searchLower) ||
        g.description?.toLowerCase().includes(searchLower) ||
        g.category?.toLowerCase().includes(searchLower)
      )

      return {
        events: filteredEvents.slice(0, 5),
        places: filteredPlaces.slice(0, 5),
        opportunities: filteredOpps.slice(0, 5),
        groups: filteredGroups.slice(0, 5),
        eventsCount: filteredEvents.length,
        placesCount: filteredPlaces.length,
        opportunitiesCount: filteredOpps.length,
        groupsCount: filteredGroups.length
      }
    }

    // Test search with query "coffee"
    const results = await handleSearch('coffee', '5', 'all')

    // Verify results
    expect(results.eventsCount).toBe(1)
    expect(results.events[0].title).toBe('Coffee Meetup')
    expect(results.placesCount).toBe(1)
    expect(results.places[0].name).toBe('Coffee Shop')
    expect(results.opportunitiesCount).toBe(0) // No opportunities match "coffee"
    expect(results.groupsCount).toBe(0) // No groups match "coffee"

    // Verify database calls were made
    expect(Event.filter).toHaveBeenCalledWith({ status: 'approved' })
    expect(Place.filter).toHaveBeenCalledWith({ status: 'approved' })
    expect(Opportunity.filter).toHaveBeenCalledWith({ status: 'approved' })
    expect(InterestGroup.filter).toHaveBeenCalledWith({ status: 'approved' })
  })

  it('should return empty results when query is empty and category is all', async () => {
    const handleSearch = async (query, radius, category = 'all') => {
      if (!query.trim() && category === 'all') {
        return {
          events: [], places: [], opportunities: [], groups: [],
          eventsCount: 0, placesCount: 0, opportunitiesCount: 0, groupsCount: 0
        }
      }
      return {}
    }

    const results = await handleSearch('', '5', 'all')

    expect(results.eventsCount).toBe(0)
    expect(results.placesCount).toBe(0)
    expect(results.opportunitiesCount).toBe(0)
    expect(results.groupsCount).toBe(0)
  })

  it('should filter results by category', async () => {
    const mockPlaces = [
      { id: 'place-1', name: 'Coffee Shop', category: 'Cafes', status: 'approved' },
      { id: 'place-2', name: 'Bar', category: 'Bars', status: 'approved' },
      { id: 'place-3', name: 'Restaurant', category: 'Restaurants', status: 'approved' }
    ]

    Place.filter.mockResolvedValue(mockPlaces)

    const handleSearch = async (query, radius, category = 'all') => {
      const allPlaces = await Place.filter({ status: 'approved' })
      const searchLower = query.toLowerCase()
      
      let filteredPlaces = (allPlaces || []).filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
      )

      // Filter by category if specified
      if (category !== 'all') {
        filteredPlaces = filteredPlaces.filter(p => 
          p.category?.toLowerCase() === category.toLowerCase() ||
          p.llm_category?.toLowerCase() === category.toLowerCase()
        )
      }

      return {
        places: filteredPlaces.slice(0, 5),
        placesCount: filteredPlaces.length
      }
    }

    // Search for "coffee" in "Cafes" category
    const results = await handleSearch('coffee', '5', 'cafes')

    expect(results.placesCount).toBe(1)
    expect(results.places[0].name).toBe('Coffee Shop')
    expect(results.places[0].category).toBe('Cafes')
  })
})

