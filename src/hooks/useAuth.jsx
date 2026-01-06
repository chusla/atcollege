import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)
  const initialSessionCheckedRef = useRef(false)

  // Fetch user profile, create if doesn't exist
  async function fetchProfile(authUser) {
    if (!authUser?.id) return null
    
    // Create basic profile from auth metadata (fallback)
    const basicProfile = {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
      first_name: authUser.user_metadata?.given_name || '',
      avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || ''
    }
    
    try {
      // Use maybeSingle() - returns null if not found, doesn't error
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(basicProfile)
        return basicProfile
      }

      // If no profile exists, try to create one
      if (!data) {
        const newProfile = { ...basicProfile, role: 'user' }
        
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .maybeSingle()
        
        if (createError) {
          console.error('Error creating profile:', createError)
          setProfile(basicProfile)
          return basicProfile
        }
        
        setProfile(created || basicProfile)
        return created || basicProfile
      }

      setProfile(data)
      return data
    } catch (error) {
      console.error('Error in fetchProfile:', error.message)
      setProfile(basicProfile)
      return basicProfile
    }
  }

  // Handle redirect after authentication
  const handlePostAuthRedirect = (userProfile) => {
    // Only redirect if we're on Landing or root
    const currentPath = window.location.pathname.toLowerCase()
    if (currentPath === '/' || currentPath === '/landing') {
      // Check if user has completed onboarding (has selected campus)
      if (!userProfile?.selected_campus_id) {
        window.location.href = '/Onboarding'
      } else {
        window.location.href = '/Home'
      }
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (initializedRef.current) return
    initializedRef.current = true

    // Safety timeout - never show loading for more than 3 seconds
    const safetyTimeout = setTimeout(() => {
      console.warn('Auth initialization timed out, forcing load completion')
      setLoading(false)
    }, 3000)

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          return
        }

        if (session?.user) {
          setUser(session.user)
          
          // Fetch profile in background - don't block auth
          fetchProfile(session.user).then(prof => {
            // Check if this is returning from OAuth (fresh login)
            const isReturningFromOAuth = window.location.hash.includes('access_token') ||
              window.location.search.includes('code=')
            if (isReturningFromOAuth && prof) {
              handlePostAuthRedirect(prof)
            }
          }).catch(err => {
            console.error('Background profile fetch failed:', err)
          })
        }
        
        // Mark initial session as checked (page reload vs fresh OAuth)
        initialSessionCheckedRef.current = true
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        clearTimeout(safetyTimeout)
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event)
        
        if (session?.user) {
          setUser(session.user)
          const prof = await fetchProfile(session.user)
          
          // Only redirect on SIGNED_IN if it's a fresh OAuth return (not page reload)
          // Fresh OAuth return has hash fragment or code param, page reload doesn't
          if (event === 'SIGNED_IN' && !initialSessionCheckedRef.current) {
            const isOAuthReturn = window.location.hash.includes('access_token') ||
              window.location.search.includes('code=')
            if (isOAuthReturn) {
              handlePostAuthRedirect(prof)
            }
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Get current user with profile merged
  const getCurrentUser = () => {
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      ...profile
    }
  }

  // Check if authenticated
  const isAuthenticated = () => {
    return !!user
  }

  // Check if user is admin
  const isAdmin = () => {
    return profile?.role === 'admin'
  }

  // Check if registration is complete
  const isRegistrationComplete = () => {
    return profile?.registration_complete === true
  }

  // Update profile (uses upsert to handle case where profile doesn't exist)
  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated')

    // Use upsert to create profile if it doesn't exist
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        ...updates
      }, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      throw error
    }
    setProfile(data)
    return data
  }

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    })
    if (error) throw error
    return data
  }

  // Sign in with email/password
  const signInWithPassword = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  // Sign up with email/password
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    })
    if (error) throw error
    return data
  }

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    isRegistrationComplete,
    getCurrentUser,
    updateProfile,
    signInWithGoogle,
    signInWithPassword,
    signUp,
    signOut,
    refreshProfile: () => user && fetchProfile(user)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth

