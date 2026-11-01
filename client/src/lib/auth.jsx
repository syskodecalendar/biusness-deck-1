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

    // Already loaded this exact session.
    if (!force && loadedTokenRef.current === token) {
      return null
    }

    // A profile request is already running.
    if (profileRequestRef.current) {
      return profileRequestRef.current
    }

    const request = (async () => {
      try {
        const { data } = await api.get('/users/me')

        setProfile(data.profile || null)
        setAccess(data.access || null)

        loadedTokenRef.current = token

        return data.profile || null
      } catch (error) {
        console.error('Failed to load user profile:', error)

        setProfile(null)
        setAccess(null)

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
      const { data } = await supabase.auth.getSession()

      if (!mounted) return

      const nextSession = data.session || null

      setSession(nextSession)

      if (nextSession) {
        await loadProfile(nextSession)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    void initialise()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return

      setSession(nextSession || null)

      if (nextSession) {
        setTimeout(() => {
          if (mounted) {
            void loadProfile(nextSession)
          }
        }, 0)
      } else {
        loadedTokenRef.current = null
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