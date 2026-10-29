import { admin } from '../lib.js'
import { can, publicAccess } from '../services/access.js'

export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '')
      .replace(/^Bearer\s+/i, '')
      .trim()

    if (!token) {
      return res.status(401).json({
        error: 'Missing bearer token'
      })
    }

    const {
      data: { user },
      error
    } = await admin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired Supabase session'
      })
    }

    let profile = null
    let profileError = null

    // Main lookup:
    // Supabase auth.users.id -> profiles.user_id
    const joined = await admin
      .from('profiles')
      .select('*,access_roles(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    profile = joined.data
    profileError = joined.error

    // Backward compatibility if access_roles migration
    // has not yet been applied.
    if (
      profileError &&
      /access_roles|relationship|column/i.test(profileError.message || '')
    ) {
      const fallback = await admin
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      profile = fallback.data
      profileError = fallback.error
    }

    // Optional compatibility with very old installations
    // where profiles.id may have been the Auth user id.
    if (!profile && !profileError) {
      const legacy = await admin
        .from('profiles')
        .select('*,access_roles(*)')
        .eq('id', user.id)
        .maybeSingle()

      profile = legacy.data

      if (
        legacy.error &&
        /access_roles|relationship|column/i.test(
          legacy.error.message || ''
        )
      ) {
        const legacyFallback = await admin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        profile = legacyFallback.data
        profileError = legacyFallback.error
      } else {
        profileError = legacy.error
      }
    }

    if (profileError) {
      throw profileError
    }

    req.user = user

    req.profile = profile || {
      id: user.id,
      user_id: user.id,
      role: 'viewer',
      status: 'active',
      data_scope: 'all'
    }

    req.accessRole = profile?.access_roles || null

    // Your DB may contain Active / Inactive,
    // so normalize the value before checking.
    if (
      String(req.profile.status || '')
        .toLowerCase() === 'inactive'
    ) {
      return res.status(403).json({
        error: 'User account is inactive'
      })
    }

    next()
  } catch (error) {
    next(error)
  }
}

export const allow = (...roles) => (req, res, next) => (
  roles.includes(req.profile?.role)
    ? next()
    : res.status(403).json({
        error: 'Insufficient permission'
      })
)

export const permit = (resource, action = 'view') => (
  req,
  res,
  next
) => (
  can(req, resource, action)
    ? next()
    : res.status(403).json({
        error: `You do not have permission to ${action} ${resource.replaceAll('_', ' ')}.`
      })
)

export { publicAccess }