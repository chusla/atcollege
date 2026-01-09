import { supabase } from './supabaseClient'
import { getBoundingBox, filterByRadius } from '@/utils/geo'

// Helper to create entity CRUD operations
function createEntity(tableName) {
  return {
    // List all records
    async list(options = {}) {
      let query = supabase.from(tableName).select('*')

      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // Filter records
    async filter(filters = {}, options = {}) {
      let query = supabase.from(tableName).select('*')

      // Apply filters
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const applyCondition = (condition) => {
            if (typeof condition === 'object' && condition.operator) {
              // Handle special operators like gte, lte, like, etc.
              switch (condition.operator) {
                case 'gte':
                  query = query.gte(key, condition.value)
                  break
                case 'lte':
                  query = query.lte(key, condition.value)
                  break
                case 'gt':
                  query = query.gt(key, condition.value)
                  break
                case 'lt':
                  query = query.lt(key, condition.value)
                  break
                case 'like':
                  query = query.ilike(key, `%${condition.value}%`)
                  break
                case 'contains':
                  query = query.contains(key, condition.value)
                  break
                default:
                  query = query.eq(key, condition.value)
              }
            } else {
              query = query.eq(key, condition)
            }
          }

          if (Array.isArray(value)) {
            // Check if it's an array of filter objects or a simple array of values
            const isFilterObjects = value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'operator' in value[0]

            if (isFilterObjects) {
              // Apply each filter condition
              value.forEach(condition => applyCondition(condition))
            } else {
              // Standard IN query for array of values
              query = query.in(key, value)
            }
          } else {
            applyCondition(value)
          }
        }
      })

      // Apply options
      if (options.orderBy) {
        query = query.order(options.orderBy.column || options.orderBy, {
          ascending: options.orderBy.ascending ?? true
        })
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // Get single record by ID
    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },

    // Create new record
    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Update record
    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Delete record
    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    }
  }
}

// Export entity helpers with extended methods
export const Campus = {
  ...createEntity('campuses'),
  async search(query, limit = 50) {
    const { data, error } = await supabase
      .from('campuses')
      .select('*')
      .or(`name.ilike.%${query}%,location.ilike.%${query}%`)
      .limit(limit)
    if (error) throw error
    return data || []
  }
}

export const Event = {
  ...createEntity('events'),
  async listFeatured(campusId = null, limit = 6) {
    try {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(limit)

      if (campusId) query = query.eq('campus_id', campusId)
      const { data, error } = await query
      if (error) {
        console.error('Error fetching events:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in listFeatured events:', error)
      return []
    }
  },
  async listUpcoming(campusId = null, limit = 10) {
    return this.listFeatured(campusId, limit)
  },
  async listNearby(lat, lng, radiusMiles = 10, limit = 50) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const bbox = getBoundingBox(lat, lng, radiusMiles)

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .gte('date', today)
        .gte('latitude', bbox.minLat)
        .lte('latitude', bbox.maxLat)
        .gte('longitude', bbox.minLng)
        .lte('longitude', bbox.maxLng)
        .order('date', { ascending: true })
        .limit(limit)

      if (error) throw error

      // Filter by exact radius and add distance
      return filterByRadius(data || [], lat, lng, radiusMiles)
    } catch (error) {
      console.error('Error in listNearby events:', error)
      return []
    }
  }
}

export const Place = {
  ...createEntity('places'),
  async listFeatured(campusId = null, limit = 6) {
    try {
      let query = supabase
        .from('places')
        .select('*')
        .in('status', ['approved', 'pending']) // Include pending places from Google imports
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (campusId) query = query.eq('campus_id', campusId)
      const { data, error } = await query
      if (error) {
        console.error('Error fetching places:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in listFeatured places:', error)
      return []
    }
  },
  async listPopular(campusId = null, limit = 10) {
    return this.listFeatured(campusId, limit)
  },
  async listNearby(lat, lng, radiusMiles = 10, limit = 50) {
    try {
      const bbox = getBoundingBox(lat, lng, radiusMiles)

      const { data, error } = await supabase
        .from('places')
        .select('*')
        .in('status', ['approved', 'pending']) // Include pending places from Google imports
        .gte('latitude', bbox.minLat)
        .lte('latitude', bbox.maxLat)
        .gte('longitude', bbox.minLng)
        .lte('longitude', bbox.maxLng)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (error) throw error

      // Filter by exact radius and add distance
      return filterByRadius(data || [], lat, lng, radiusMiles)
    } catch (error) {
      console.error('Error in listNearby places:', error)
      return []
    }
  },
  async findByGooglePlaceId(googlePlaceId) {
    try {
      // Handle duplicates by getting the most recent one (or first approved)
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .order('imported_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        // If maybeSingle fails due to multiple rows, try without it
        if (error.code === 'PGRST116') {
          const { data: allData, error: allError } = await supabase
            .from('places')
            .select('*')
            .eq('google_place_id', googlePlaceId)
            .order('imported_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(1)

          if (allError) throw allError
          return allData?.[0] || null
        }
        throw error
      }
      return data
    } catch (error) {
      console.error('Error finding place by Google Place ID:', error)
      return null
    }
  },
  async findByGooglePlaceIds(googlePlaceIds) {
    try {
      if (!googlePlaceIds || googlePlaceIds.length === 0) {
        return []
      }
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .in('google_place_id', googlePlaceIds)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error finding places by Google Place IDs:', error)
      return []
    }
  },
  async createFromGooglePlace(googlePlaceData, campusId = null) {
    try {
      // First check if place already exists to avoid 409 conflict errors
      if (googlePlaceData.google_place_id) {
        const { data: existingPlace } = await supabase
          .from('places')
          .select()
          .eq('google_place_id', googlePlaceData.google_place_id)
          .single();

        if (existingPlace) {
          console.log('📝 [PLACE] Place already exists, returning existing:', googlePlaceData.name);
          return existingPlace;
        }
      }

      // Generate description from Google data or editorial summary
      let description = googlePlaceData.editorials_summary || googlePlaceData.editorial_summary?.overview || null;

      // If no description, create one from types and name
      if (!description && googlePlaceData.types) {
        const primaryTypes = googlePlaceData.types
          .filter(t => !t.includes('establishment') && !t.includes('point_of_interest'))
          .slice(0, 3)
          .map(t => t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

        if (primaryTypes.length > 0) {
          description = `${googlePlaceData.name} is a ${primaryTypes.join(', ')} located ${googlePlaceData.address ? `at ${googlePlaceData.address.split(',')[0]}` : 'in the area'}.`;
        }
      }

      console.log('📝 [PLACE] Creating new place:', googlePlaceData.name);

      const placeData = {
        name: googlePlaceData.name,
        address: googlePlaceData.address,
        description: description,
        latitude: googlePlaceData.latitude,
        longitude: googlePlaceData.longitude,
        rating: googlePlaceData.rating || null, // Average rating from Google
        image_url: googlePlaceData.photo_url || null, // Cover image from Google
        google_place_id: googlePlaceData.google_place_id,
        google_place_data: {
          ...(googlePlaceData.raw_data || googlePlaceData),
          user_ratings_total: googlePlaceData.user_ratings_total || 0, // Total number of ratings
          rating: googlePlaceData.rating || null, // Average rating
          photo_url: googlePlaceData.photo_url || null
        },
        source: 'google_maps',
        status: 'pending',
        categorization_status: 'pending',
        imported_at: new Date().toISOString()
      }

      if (campusId) {
        placeData.campus_id = campusId
      }

      const { data, error } = await supabase
        .from('places')
        .insert(placeData)
        .select()
        .single()

      if (error) {
        // Handle race condition - place was created between check and insert
        if (error.code === '23505' && googlePlaceData.google_place_id) {
          console.log('📝 [PLACE] Race condition: place was just created, fetching:', googlePlaceData.name);
          const { data: existingPlace, error: fetchError } = await supabase
            .from('places')
            .select()
            .eq('google_place_id', googlePlaceData.google_place_id)
            .single();

          if (fetchError) throw fetchError;
          return existingPlace;
        }
        throw error;
      }
      return data
    } catch (error) {
      console.error('Error creating place from Google data:', error)
      throw error
    }
  },
  async updateImageFromGoogle(placeId, googlePlaceId) {
    try {
      // Fetch place details to get photo
      const { getPlaceDetails } = await import('./googlePlaces')
      const details = await getPlaceDetails(googlePlaceId)

      if (details?.photo_url) {
        const { data, error } = await supabase
          .from('places')
          .update({ image_url: details.photo_url })
          .eq('id', placeId)
          .select()
          .single()

        if (error) throw error
        return data
      }
      return null
    } catch (error) {
      console.error('Error updating place image from Google:', error)
      return null
    }
  },
  async updateAllPlaceImages() {
    try {
      // Get all places with google_place_id but placeholder/unsplash images
      const { data: places, error } = await supabase
        .from('places')
        .select('id, google_place_id, image_url')
        .not('google_place_id', 'is', null)
        .or('image_url.is.null,image_url.ilike.%unsplash%,image_url.ilike.%placeholder%')

      if (error) throw error
      if (!places || places.length === 0) {
        console.log('No places need image updates')
        return []
      }

      console.log(`Updating images for ${places.length} places`)
      const { getPlaceDetails } = await import('./googlePlaces')
      const results = []

      // Process in batches to avoid rate limits
      for (let i = 0; i < places.length; i++) {
        const place = places[i]
        try {
          const details = await getPlaceDetails(place.google_place_id)
          if (details?.photo_url) {
            const { error: updateError } = await supabase
              .from('places')
              .update({ image_url: details.photo_url })
              .eq('id', place.id)

            if (!updateError) {
              results.push({ id: place.id, success: true })
              console.log(`Updated image for place ${place.id}`)
            } else {
              results.push({ id: place.id, success: false, error: updateError })
            }
          }

          // Small delay to avoid rate limits
          if (i < places.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        } catch (error) {
          console.error(`Error updating place ${place.id}:`, error)
          results.push({ id: place.id, success: false, error: error.message })
        }
      }

      return results
    } catch (error) {
      console.error('Error updating all place images:', error)
      return []
    }
  },
  async updateCategorizationStatus(id, status, llmCategory = null, confidence = null) {
    try {
      const updates = {
        categorization_status: status,
        last_categorized_at: new Date().toISOString()
      }

      if (llmCategory) {
        updates.llm_category = llmCategory
      }

      if (confidence !== null) {
        updates.llm_category_confidence = confidence
      }

      const { data, error } = await supabase
        .from('places')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating categorization status:', error)
      throw error
    }
  }
}

export const Opportunity = {
  ...createEntity('opportunities'),
  async listFeatured(campusId = null, limit = 6) {
    try {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'approved')
        .or(`deadline.is.null,deadline.gte.${today}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (campusId) query = query.eq('campus_id', campusId)
      const { data, error } = await query
      if (error) {
        console.error('Error fetching opportunities:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in listFeatured opportunities:', error)
      return []
    }
  },
  async listActive(campusId = null, limit = 20) {
    return this.listFeatured(campusId, limit)
  }
}

export const InterestGroup = {
  ...createEntity('interest_groups'),
  async listFeatured(campusId = null, limit = 8) {
    try {
      let query = supabase
        .from('interest_groups')
        .select('*')
        .eq('status', 'approved')
        .order('member_count', { ascending: false })
        .limit(limit)

      if (campusId) query = query.eq('campus_id', campusId)
      const { data, error } = await query
      if (error) {
        console.error('Error fetching interest groups:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in listFeatured groups:', error)
      return []
    }
  },
  async listPopular(campusId = null, limit = 10) {
    return this.listFeatured(campusId, limit)
  }
}

export const SavedItem = {
  ...createEntity('saved_items'),
  async listByUser(userId, itemType = null) {
    let query = supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (itemType) query = query.eq('item_type', itemType)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },
  async isSaved(userId, itemType, itemId) {
    const { data } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle()
    return !!data
  },
  async toggle(userId, itemType, itemId) {
    const { data: existing } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle()

    if (existing) {
      await supabase.from('saved_items').delete().eq('id', existing.id)
      return false
    } else {
      await supabase.from('saved_items').insert({ user_id: userId, item_type: itemType, item_id: itemId })
      return true
    }
  }
}

export const Comment = {
  ...createEntity('comments'),
  async listByItem(itemType, itemId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },
  async listThreaded(itemType, itemId) {
    const comments = await this.listByItem(itemType, itemId)
    const map = {}
    const roots = []
    comments.forEach(c => { map[c.id] = { ...c, replies: [] } })
    comments.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(map[c.id])
      } else if (!c.parent_id) {
        roots.push(map[c.id])
      }
    })
    return roots
  }
}

// User/Auth helper that mimics Base44's auth API
export const User = {
  // Check if user is authenticated
  isAuthenticated() {
    const session = supabase.auth.getSession()
    return session !== null
  },

  // Get current user with profile
  async me() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch profile data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return { ...user, profile: null }
    }

    return {
      id: user.id,
      email: user.email,
      ...profile
    }
  },

  // Update current user's profile
  async updateMe(updates) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Sign in with OAuth
  async login(provider = 'google') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) throw error
    return data
  },

  // Sign in with email/password
  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Sign up with email/password
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Sign out
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export default {
  Campus,
  Event,
  Place,
  Opportunity,
  InterestGroup,
  SavedItem,
  Comment,
  User
}

