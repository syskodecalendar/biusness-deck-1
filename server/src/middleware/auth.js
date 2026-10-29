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

    // Validate Supabase access token
    const {
      data: { user },
      error: authError
    } = await admin.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({
        error: 'Invalid or expired Supabase session'
      })
    }

    let profile = null
    let profileError = null

    // Correct relationship:
    // auth.users.id = profiles.id
    const joined = await admin
      .from('profiles')
      .select('*,access_roles(*)')
      .eq('id', user.id)
      .maybeSingle()

    profile = joined.data
    profileError = joined.error

    // Fallback in case the access_roles relationship
    // is unavailable or migration is incomplete
    if (
      profileError &&
      /access_roles|relationship|column/i.test(
        profileError.message || ''
      )
    ) {
      const fallback = await admin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      profile = fallback.data
      profileError = fallback.error
    }

    if (profileError) {
      throw profileError
    }

    req.user = user

    // If no profile exists, keep safe viewer fallback
    req.profile = profile || {
      id: user.id,
      role: 'viewer',
      status: 'active',
      data_scope: 'all'
    }

    req.accessRole = profile?.access_roles || null

    // Normalize status because database values may use
    // Active / Inactive or lowercase equivalents
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

export const allow = (...roles) => (
  req,
  res,
  next
) => {
  if (roles.includes(req.profile?.role)) {
    return next()
  }

  return res.status(403).json({
    error: 'Insufficient permission'
  })
}

export const permit = (
  resource,
  action = 'view'
) => (
  req,
  res,
  next
) => {
  if (can(req, resource, action)) {
    return next()
  }

  return res.status(403).json({
    error: `You do not have permission to ${action} ${resource.replaceAll('_', ' ')}.`
  })
}

export { publicAccess }