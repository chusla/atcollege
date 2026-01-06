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
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else if (typeof value === 'object' && value.operator) {
            // Handle special operators like gte, lte, like, etc.
            switch (value.operator) {
              case 'gte':
                query = query.gte(key, value.value)
                break
              case 'lte':
                query = query.lte(key, value.value)
                break
              case 'gt':
                query = query.gt(key, value.value)
                break
              case 'lt':
                query = query.lt(key, value.value)
                break
              case 'like':
                query = query.ilike(key, `%${value.value}%`)
                break
              case 'contains':
                query = query.contains(key, value.value)
                break
              default:
                query = query.eq(key, value.value)
            }
          } else {
            query = query.eq(key, value)
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
        .eq('status', 'approved')
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
        .eq('status', 'approved')
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

