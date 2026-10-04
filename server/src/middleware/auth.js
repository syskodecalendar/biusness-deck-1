import { admin } from '../lib.js'
import { can, publicAccess } from '../services/access.js'

export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return res.status(401).json({ error: 'Missing bearer token' })

    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired Supabase session' })

    let profile = null
    let profileError = null
    const joined = await admin.from('profiles').select('*,access_roles(*)').eq('id', user.id).maybeSingle()
    profile = joined.data
    profileError = joined.error

    // Backward-compatible fallback while a customer applies the V2.2 SQL migration.
    if (profileError && /access_roles|relationship|column/i.test(profileError.message || '')) {
      const fallback = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
      profile = fallback.data
      profileError = fallback.error
    }
    if (profileError) throw profileError

    req.user = user
    req.profile = profile || { id: user.id, role: 'viewer', status: 'active', data_scope: 'all' }
    req.accessRole = profile?.access_roles || null

    if (req.profile.status === 'inactive') return res.status(403).json({ error: 'User account is inactive' })
    next()
  } catch (error) { next(error) }
}

export const allow = (...roles) => (req, res, next) => (
  roles.includes(req.profile?.role)
    ? next()
    : res.status(403).json({ error: 'Insufficient permission' })
)

export const permit = (resource, action = 'view') => (req, res, next) => (
  can(req, resource, action)
    ? next()
    : res.status(403).json({ error: `You do not have permission to ${action} ${resource.replaceAll('_', ' ')}.` })
)

export { publicAccess }
