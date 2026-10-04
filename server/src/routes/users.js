import { Router } from 'express'
import { admin } from '../lib.js'
import { audit } from '../services/audit.js'
import { isSuperAdmin, publicAccess } from '../services/access.js'

const r = Router()
const legacyRoles = new Set(['super_admin', 'management', 'finance', 'project_manager', 'viewer'])

async function roleById(id) {
  if (!id) return null
  const { data, error } = await admin.from('access_roles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}


async function validateScopeAssignment(role, dataScope, linkedVendorId, linkedClientId) {
  const allowed = new Set(['all', 'vendor', 'client', 'projects', 'own_projects'])
  if (!allowed.has(dataScope)) return 'Select a valid data scope.'
  if (role?.code === 'vendor_portal' && dataScope !== 'vendor') return 'Vendor Portal users must use the One linked vendor data scope.'
  if (role?.code === 'client_portal' && dataScope !== 'client') return 'Client Portal users must use the One linked client data scope.'
  if (dataScope === 'vendor') {
    if (!linkedVendorId) return 'Select the vendor linked to this user.'
    const { data, error } = await admin.from('vendors').select('id').eq('id', linkedVendorId).maybeSingle()
    if (error) throw error
    if (!data) return 'The selected linked vendor does not exist.'
  }
  if (dataScope === 'client') {
    if (!linkedClientId) return 'Select the client linked to this user.'
    const { data, error } = await admin.from('clients').select('id').eq('id', linkedClientId).maybeSingle()
    if (error) throw error
    if (!data) return 'The selected linked client does not exist.'
  }
  return null
}

async function ensureInitialAdmin(req) {
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin').eq('status', 'active')
  if (error) throw error
  if (Number(count || 0) !== 0) return

  let accessRoleId = null
  const roleLookup = await admin.from('access_roles').select('id').eq('code', 'super_admin').maybeSingle()
  if (!roleLookup.error) accessRoleId = roleLookup.data?.id || null
  const update = { id: req.user.id, full_name: req.user.user_metadata?.full_name || req.user.email, role: 'super_admin', status: 'active', data_scope: 'all' }
  if (accessRoleId) update.access_role_id = accessRoleId
  const { data, error: updateError } = await admin.from('profiles').upsert(update).select('*').single()
  if (updateError) throw updateError
  req.profile = data
  if (accessRoleId) req.accessRole = await roleById(accessRoleId)
}

r.get('/me', async (req, res, next) => {
  try {
    await ensureInitialAdmin(req)
    res.json({ user: { id: req.user.id, email: req.user.email }, profile: req.profile, access: publicAccess(req) })
  } catch (e) { next(e) }
})

r.get('/', async (req, res, next) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Only Super Admin can manage users.' })
    const [{ data: listed, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from('profiles').select('*,access_roles(id,name,code)').order('created_at', { ascending: true })
    ])
    if (authError) throw authError
    if (profileError) throw profileError
    const byId = new Map((profiles || []).map(p => [p.id, p]))
    res.json((listed?.users || []).map(u => {
      const p = byId.get(u.id) || {}
      return { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, ...p, role_name: p.access_roles?.name || p.role }
    }))
  } catch (e) { next(e) }
})

r.post('/', async (req, res, next) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Only Super Admin can create users.' })
    const { email, password, full_name, access_role_id, status = 'active', data_scope = 'all', linked_vendor_id, linked_client_id, allowed_project_ids = [] } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })
    const role = await roleById(access_role_id)
    if (!role) return res.status(400).json({ error: 'Select a valid access role.' })
    const scopeError = await validateScopeAssignment(role, data_scope, linked_vendor_id, linked_client_id)
    if (scopeError) return res.status(400).json({ error: scopeError })
    const legacyRole = legacyRoles.has(role.code) ? role.code : 'viewer'
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: full_name || email } })
    if (error) throw error
    const profilePayload = {
      id: data.user.id,
      full_name: full_name || email,
      role: legacyRole,
      access_role_id: role.id,
      status,
      data_scope,
      linked_vendor_id: data_scope === 'vendor' ? linked_vendor_id || null : null,
      linked_client_id: data_scope === 'client' ? linked_client_id || null : null,
      allowed_project_ids: data_scope === 'projects' ? allowed_project_ids : []
    }
    const { data: profile, error: profileError } = await admin.from('profiles').upsert(profilePayload).select('*,access_roles(id,name,code)').single()
    if (profileError) throw profileError
    await audit(req, 'create', 'users', data.user.id, null, { email, ...profile })
    res.status(201).json({ id: data.user.id, email: data.user.email, ...profile, role_name: profile.access_roles?.name || profile.role })
  } catch (e) { next(e) }
})

r.put('/:id', async (req, res, next) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Only Super Admin can update users.' })
    const { full_name, access_role_id, status, password, data_scope, linked_vendor_id, linked_client_id, allowed_project_ids } = req.body || {}
    const role = access_role_id ? await roleById(access_role_id) : null
    if (access_role_id && !role) return res.status(400).json({ error: 'Invalid access role.' })
    if (req.params.id === req.user.id && (status === 'inactive' || (role && role.code !== 'super_admin'))) {
      return res.status(409).json({ error: 'You cannot deactivate yourself or remove your own Super Admin role.' })
    }
    const { data: before } = await admin.from('profiles').select('*,access_roles(id,name,code)').eq('id', req.params.id).maybeSingle()
    if (!before) return res.status(404).json({ error: 'User profile not found.' })
    const update = {}
    if (full_name !== undefined) update.full_name = full_name
    if (status !== undefined) update.status = status
    if (role) {
      update.access_role_id = role.id
      update.role = legacyRoles.has(role.code) ? role.code : 'viewer'
    }
    const nextScope = data_scope ?? before.data_scope ?? 'all'
    const nextVendorId = nextScope === 'vendor' ? (linked_vendor_id !== undefined ? linked_vendor_id : before.linked_vendor_id) : null
    const nextClientId = nextScope === 'client' ? (linked_client_id !== undefined ? linked_client_id : before.linked_client_id) : null
    const effectiveRole = role || before.access_roles || await roleById(before.access_role_id)
    const scopeError = await validateScopeAssignment(effectiveRole, nextScope, nextVendorId, nextClientId)
    if (scopeError) return res.status(400).json({ error: scopeError })
    if (data_scope !== undefined) update.data_scope = nextScope
    if (linked_vendor_id !== undefined || data_scope !== undefined) update.linked_vendor_id = nextVendorId
    if (linked_client_id !== undefined || data_scope !== undefined) update.linked_client_id = nextClientId
    if (allowed_project_ids !== undefined || data_scope !== undefined) update.allowed_project_ids = nextScope === 'projects' ? (allowed_project_ids || []) : []

    const { data: profile, error } = await admin.from('profiles').update(update).eq('id', req.params.id).select('*,access_roles(id,name,code)').single()
    if (error) throw error
    if (password) {
      const { error: authError } = await admin.auth.admin.updateUserById(req.params.id, { password })
      if (authError) throw authError
    }
    await audit(req, 'update', 'users', req.params.id, before, { ...profile, password_changed: Boolean(password) })
    res.json({ ...profile, role_name: profile.access_roles?.name || profile.role })
  } catch (e) { next(e) }
})

r.delete('/:id', async (req, res, next) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Only Super Admin can delete users.' })
    if (req.params.id === req.user.id) return res.status(409).json({ error: 'You cannot delete your own user account.' })
    const { data: before } = await admin.from('profiles').select('*,access_roles(id,name,code)').eq('id', req.params.id).maybeSingle()
    if (!before) return res.status(404).json({ error: 'User profile not found.' })
    if (before.role === 'super_admin' || before.access_roles?.code === 'super_admin') {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin').eq('status', 'active')
      if (Number(count || 0) <= 1) return res.status(409).json({ error: 'The last active Super Admin cannot be deleted.' })
    }
    const { data: profile, error } = await admin.from('profiles').update({ status: 'inactive' }).eq('id', req.params.id).select().single()
    if (error) throw error
    await audit(req, 'deactivate', 'users', req.params.id, before, profile)
    res.json({ deactivated: true, profile })
  } catch (e) { next(e) }
})

export default r
