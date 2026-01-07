import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)
  const initialSessionCheckedRef = useRef(false)

  // Fetch user profile, create if doesn't exist
  async function fetchProfile(authUser) {
    if (!authUser?.id) {
      setProfileLoaded(true)
      return null
    }
    
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
        setProfileLoaded(true)
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
          setProfileLoaded(true)
          return basicProfile
        }
        
        setProfile(created || basicProfile)
        setProfileLoaded(true)
        return created || basicProfile
      }

      setProfile(data)
      setProfileLoaded(true)
      return data
    } catch (error) {
      console.error('Error in fetchProfile:', error.message)
      setProfile(basicProfile)
      setProfileLoaded(true)
      return basicProfile
    }
  }

  // Handle redirect after authentication
  const handlePostAuthRedirect = (userProfile) => {
    const currentPath = window.location.pathname.toLowerCase()
    
    // Pages where we should redirect after auth
    const authRedirectPages = ['/', '/landing', '/selectcollege']
    
    if (authRedirectPages.includes(currentPath)) {
      // Check if user has completed onboarding (has selected campus)
      if (!userProfile?.selected_campus_id || !userProfile?.registration_complete) {
        window.location.href = '/Onboarding'
      } else {
        window.location.href = '/Home'
      }
    }
  }
  
  // Get redirect destination for authenticated user (used by components)
  const getAuthRedirectPath = (userProfile) => {
    if (!userProfile?.selected_campus_id || !userProfile?.registration_complete) {
      return '/Onboarding'
    }
    return '/Home'
  }

  // Initialize auth state
  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (initializedRef.current) return
    initializedRef.current = true

    // Safety timeout - complete loading after 2 seconds max (handles slow networks)
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
    }, 2000)

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
      (event, session) => {
        if (session?.user) {
          setUser(session.user)
          
          // Fetch profile in background (don't block with await)
          fetchProfile(session.user).then(prof => {
            // Only redirect on SIGNED_IN if it's a fresh OAuth return (not page reload)
            if (event === 'SIGNED_IN' && !initialSessionCheckedRef.current) {
              const isOAuthReturn = window.location.hash.includes('access_token') ||
                window.location.search.includes('code=')
              if (isOAuthReturn) {
                handlePostAuthRedirect(prof)
              }
            }
          })
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

  // Check if registration is complete (must have both flag and campus selected)
  const isRegistrationComplete = () => {
    return profile?.registration_complete === true && !!profile?.selected_campus_id
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
    profileLoaded,
    loading,
    isAuthenticated,
    isAdmin,
    isRegistrationComplete,
    getCurrentUser,
    getAuthRedirectPath: () => getAuthRedirectPath(profile),
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

