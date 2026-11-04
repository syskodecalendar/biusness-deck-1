import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { supabase } from './supabase'
import { api } from './api'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)

  const profileRequestRef = useRef(null)
  const loadedTokenRef = useRef(null)

  const loadProfile = async (currentSession, force = false) => {
    if (!currentSession) {
      setProfile(null)
      setAccess(null)
      loadedTokenRef.current = null
      return null
    }

    const token = currentSession.access_token

    // Already successfully loaded this exact session.
    if (!force && loadedTokenRef.current === token) {
      return profile
    }

    // Prevent multiple /users/me requests at the same time.
    if (profileRequestRef.current) {
      return profileRequestRef.current
    }

    const request = (async () => {
      try {
        const { data } = await api.get('/users/me')

        setProfile(data.profile || null)
        setAccess(data.access || null)

        // Mark this token as successfully loaded only after
        // the API request has completed successfully.
        loadedTokenRef.current = token

        return data.profile || null
      } catch (error) {
        console.error('Failed to load user profile:', error)

        const status = error?.response?.status

        /*
         * IMPORTANT:
         *
         * Do NOT clear an already loaded profile because of:
         * - Network Error
         * - ERR_CONNECTION_RESET
         * - CORS/LiteSpeed failure
         * - timeout
         * - 5xx server error
         *
         * Otherwise a temporary hosting/network failure causes
         * Super Admin to suddenly appear as Viewer.
         *
         * Only clear profile/access when the server explicitly
         * tells us that authentication is invalid.
         */
        if (status === 401 || status === 403) {
          setProfile(null)
          setAccess(null)
          loadedTokenRef.current = null
        }

        return null
      } finally {
        profileRequestRef.current = null
      }
    })()

    profileRequestRef.current = request

    return request
  }

  useEffect(() => {
    let mounted = true

    const initialise = async () => {
      try {
        const { data } = await supabase.auth.getSession()

        if (!mounted) return

        const nextSession = data.session || null

        setSession(nextSession)

        if (nextSession) {
          await loadProfile(nextSession)
        }
      } catch (error) {
        console.error('Failed to initialise authentication:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void initialise()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return

      setSession(nextSession || null)

      if (nextSession) {
        /*
         * Supabase may fire events such as TOKEN_REFRESHED.
         * loadProfile() already prevents duplicate simultaneous
         * requests and avoids reloading an already loaded token.
         */
        setTimeout(() => {
          if (mounted) {
            void loadProfile(nextSession)
          }
        }, 0)
      } else {
        // Genuine logout/session removal.
        loadedTokenRef.current = null
        profileRequestRef.current = null

        setProfile(null)
        setAccess(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (result.data?.session) {
      setSession(result.data.session)
    }

    return result
  }

  const signOut = async () => {
    const result = await supabase.auth.signOut()

    loadedTokenRef.current = null
    profileRequestRef.current = null

    setSession(null)
    setProfile(null)
    setAccess(null)

    return result
  }

  const refreshProfile = () => loadProfile(session, true)

  const can = (resource, action = 'view') =>
    access?.permissions?.[resource]?.[action] === true ||
    access?.role?.code === 'super_admin'

  const canView = (resource) => can(resource, 'view')

  const showColumn = (resource, key) => {
    if (access?.role?.code === 'super_admin') {
      return true
    }

    const cols = access?.columns?.[resource]

    return (
      !Array.isArray(cols) ||
      cols.includes('*') ||
      cols.includes(key)
    )
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user,
        profile,
        access,
        can,
        canView,
        showColumn,
        loading,
        signIn,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}