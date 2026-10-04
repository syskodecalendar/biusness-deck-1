import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { api } from './api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (currentSession) => {
    if (!currentSession) { setProfile(null); setAccess(null); return null }
    try {
      const { data } = await api.get('/users/me')
      setProfile(data.profile || null)
      setAccess(data.access || null)
      return data.profile || null
    } catch {
      setProfile(null); setAccess(null); return null
    }
  }

  useEffect(() => {
    let mounted = true
    const initialise = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      const next = data.session || null
      setSession(next)
      if (next) await loadProfile(next)
      if (mounted) setLoading(false)
    }
    void initialise()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession || null)
      if (nextSession) setTimeout(() => { if (mounted) void loadProfile(nextSession) }, 0)
      else { setProfile(null); setAccess(null) }
      setLoading(false)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.session) { setSession(result.data.session); await loadProfile(result.data.session) }
    return result
  }
  const signOut = async () => { const result = await supabase.auth.signOut(); setSession(null); setProfile(null); setAccess(null); return result }
  const refreshProfile = () => loadProfile(session)
  const can = (resource, action = 'view') => access?.permissions?.[resource]?.[action] === true || access?.role?.code === 'super_admin'
  const canView = resource => can(resource, 'view')
  const showColumn = (resource, key) => {
    if (access?.role?.code === 'super_admin') return true
    const cols = access?.columns?.[resource]
    return !Array.isArray(cols) || cols.includes('*') || cols.includes(key)
  }
  return <AuthContext.Provider value={{ session, user: session?.user, profile, access, can, canView, showColumn, loading, signIn, signOut, refreshProfile }}>{children}</AuthContext.Provider>
}
