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
  async searchNearby(searchQuery, lat, lng, radiusMiles = 50, limit = 100) {
    try {
      console.log('📍 [DB] Searching places nearby:', { searchQuery, lat, lng, radiusMiles });
      const bbox = getBoundingBox(lat, lng, radiusMiles)
      const searchLower = searchQuery.toLowerCase()

      // Query places within bounding box
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .in('status', ['approved', 'pending'])
        .gte('latitude', bbox.minLat)
        .lte('latitude', bbox.maxLat)
        .gte('longitude', bbox.minLng)
        .lte('longitude', bbox.maxLng)
        .limit(limit)

      if (error) throw error

      // Filter by search query and exact radius
      const filtered = (data || []).filter(p => {
        const matchesSearch = 
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower) ||
          p.llm_category?.toLowerCase().includes(searchLower) ||
          p.address?.toLowerCase().includes(searchLower) ||
          p.google_place_data?.types?.some(t => t.toLowerCase().includes(searchLower));
        return matchesSearch;
      });

      // Add distance and filter by exact radius
      const withDistance = filterByRadius(filtered, lat, lng, radiusMiles);
      console.log('📍 [DB] Search results:', { total: data?.length, filtered: filtered.length, withinRadius: withDistance.length });
      return withDistance;
    } catch (error) {
      console.error('Error in searchNearby places:', error)
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
  async createFromGooglePlace(googlePlaceData, campusId = null, userId = null) {
    try {
      // First check if place already exists to avoid 409 conflict errors
      if (googlePlaceData.google_place_id) {
        // Use maybeSingle() instead of single() - returns null if no rows found
        const { data: existingPlace, error } = await supabase
          .from('places')
          .select()
          .eq('google_place_id', googlePlaceData.google_place_id)
          .maybeSingle();

        // Ignore PGRST116 errors (no rows or RLS blocking)
        if (existingPlace && !error) {
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

      // Get current user ID if not provided
      let createdBy = userId
      if (!createdBy) {
        const { data: { user } } = await supabase.auth.getUser()
        createdBy = user?.id || null
      }

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
        imported_at: new Date().toISOString(),
        created_by: createdBy // Set created_by so RLS allows updates
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
            .maybeSingle();

          // Return existing place if found, otherwise the insert itself succeeded
          if (existingPlace) return existingPlace;
          if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
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
        // Use maybeSingle() to handle RLS blocking gracefully
        const { data, error } = await supabase
          .from('places')
          .update({ image_url: details.photo_url })
          .eq('id', placeId)
          .select()
          .maybeSingle()

        // Ignore PGRST116 errors (RLS blocking)
        if (error && error.code !== 'PGRST116') throw error
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

      // Don't use .single() - RLS might block the update for Google-imported places
      // where created_by is null. Use .maybeSingle() to handle 0 rows gracefully.
      const { data, error } = await supabase
        .from('places')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        // If RLS blocked the update (406/PGRST116), log warning but don't throw
        if (error.code === 'PGRST116') {
          console.warn('Categorization update blocked by RLS for place:', id)
          return null
        }
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error updating categorization status:', error)
      // Don't throw for RLS-related errors, just return null
      if (error.code === 'PGRST116' || error.message?.includes('406')) {
        return null
      }
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

export const SearchQuery = createEntity('search_queries')

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

// Entity Images - Multiple images per listing
export const EntityImage = {
  ...createEntity('entity_images'),
  
  // Get all images for an entity
  async listByEntity(entityType, entityId) {
    const { data, error } = await supabase
      .from('entity_images')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    return data || []
  },
  
  // Get primary image for an entity
  async getPrimary(entityType, entityId) {
    const { data, error } = await supabase
      .from('entity_images')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_primary', true)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },
  
  // Set an image as primary (automatically unsets others via DB trigger)
  async setPrimary(imageId) {
    const { data, error } = await supabase
      .from('entity_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Add a new image to an entity
  async addToEntity(entityType, entityId, imageUrl, options = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    
    const imageData = {
      entity_type: entityType,
      entity_id: entityId,
      image_url: imageUrl,
      storage_path: options.storagePath || null,
      caption: options.caption || null,
      alt_text: options.altText || null,
      is_primary: options.isPrimary || false,
      sort_order: options.sortOrder || 0,
      source: options.source || 'admin',
      uploaded_by: user?.id || null
    }
    
    const { data, error } = await supabase
      .from('entity_images')
      .insert(imageData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Upload image to storage and add to entity
  async uploadToEntity(entityType, entityId, file, options = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    
    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${entityType}s/${entityId}/${Date.now()}.${fileExt}`
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName)
    
    // Create entity_images record
    return this.addToEntity(entityType, entityId, publicUrl, {
      storagePath: fileName,
      isPrimary: options.isPrimary || false,
      source: options.source || 'admin',
      caption: options.caption,
      altText: options.altText
    })
  },
  
  // Update sort order for multiple images
  async updateSortOrder(imageUpdates) {
    const updates = imageUpdates.map(({ id, sortOrder }) =>
      supabase
        .from('entity_images')
        .update({ sort_order: sortOrder })
        .eq('id', id)
    )
    
    await Promise.all(updates)
  },
  
  // Delete image (and remove from storage if applicable)
  async deleteImage(imageId) {
    // Get image first to check storage_path
    const { data: image, error: fetchError } = await supabase
      .from('entity_images')
      .select('*')
      .eq('id', imageId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Delete from storage if it was uploaded
    if (image.storage_path) {
      await supabase.storage
        .from('uploads')
        .remove([image.storage_path])
    }
    
    // Delete the record
    const { error } = await supabase
      .from('entity_images')
      .delete()
      .eq('id', imageId)
    
    if (error) throw error
    return true
  },

  // Migrate existing image_url to entity_images table
  async migrateEntityImage(entityType, entityId, imageUrl) {
    if (!imageUrl) return null
    
    // Check if already migrated
    const existing = await this.listByEntity(entityType, entityId)
    if (existing.some(img => img.image_url === imageUrl)) {
      return existing.find(img => img.image_url === imageUrl)
    }
    
    // Add as primary
    return this.addToEntity(entityType, entityId, imageUrl, {
      isPrimary: true,
      source: 'import'
    })
  }
}

// Site Settings - Configurable app settings
export const SiteSetting = {
  ...createEntity('site_settings'),
  
  // Get a setting by key
  async getByKey(key) {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('setting_key', key)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },
  
  // Get setting value (parsed from JSONB)
  async getValue(key, defaultValue = null) {
    const setting = await this.getByKey(key)
    return setting?.setting_value ?? defaultValue
  },
  
  // Set a setting (upsert)
  async setValue(key, value, description = null) {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('site_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        description: description,
        updated_by: user?.id
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Get all settings
  async getAll() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('setting_key')
    
    if (error) throw error
    return data || []
  },
  
  // Helper: Get hero image config
  async getHeroImage() {
    return this.getValue('hero_image', {
      url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920',
      alt: 'Campus',
      source: 'unsplash'
    })
  },
  
  // Helper: Set hero image
  async setHeroImage(url, alt = 'Campus', source = 'admin') {
    return this.setValue('hero_image', { url, alt, source }, 'Landing page hero background image')
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
  SearchQuery,
  Comment,
  User,
  EntityImage,
  SiteSetting
}

