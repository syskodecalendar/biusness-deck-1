import { Router } from 'express'
import { admin } from '../lib.js'
import { audit } from '../services/audit.js'
import { columnCatalog, isSuperAdmin, permissionCatalog } from '../services/access.js'

const r = Router()
const guard = (req, res) => {
  if (isSuperAdmin(req)) return true
  res.status(403).json({ error: 'Only Super Admin can manage roles and access policies.' })
  return false
}

r.get('/catalog', (req, res) => {
  if (!guard(req, res)) return
  res.json({ permissions: permissionCatalog, columns: columnCatalog })
})

r.get('/roles', async (req, res, next) => {
  try {
    if (!guard(req, res)) return
    const { data, error } = await admin.from('access_roles').select('*').order('is_system', { ascending: false }).order('name')
    if (error) throw error
    res.json(data || [])
  } catch (e) { next(e) }
})

r.post('/roles', async (req, res, next) => {
  try {
    if (!guard(req, res)) return
    const payload = {
      name: String(req.body?.name || '').trim(),
      code: String(req.body?.code || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
      description: req.body?.description || null,
      permissions: req.body?.permissions || {},
      column_permissions: req.body?.column_permissions || {},
      is_system: false
    }
    if (!payload.name || !payload.code) return res.status(400).json({ error: 'Role name and code are required.' })
    const { data, error } = await admin.from('access_roles').insert(payload).select().single()
    if (error?.code === '23505') return res.status(409).json({ error: 'A role with this name or code already exists.' })
    if (error) throw error
    await audit(req, 'create', 'access_roles', data.id, null, data)
    res.status(201).json(data)
  } catch (e) { next(e) }
})

r.put('/roles/:id', async (req, res, next) => {
  try {
    if (!guard(req, res)) return
    const { data: before, error: readError } = await admin.from('access_roles').select('*').eq('id', req.params.id).single()
    if (readError) throw readError
    if (before.code === 'super_admin') return res.status(409).json({ error: 'The Super Admin role cannot be restricted.' })
    const payload = {
      name: req.body?.name ?? before.name,
      description: req.body?.description ?? before.description,
      permissions: req.body?.permissions ?? before.permissions,
      column_permissions: req.body?.column_permissions ?? before.column_permissions,
      updated_at: new Date().toISOString()
    }
    const { data, error } = await admin.from('access_roles').update(payload).eq('id', req.params.id).select().single()
    if (error) throw error
    await audit(req, 'update', 'access_roles', data.id, before, data)
    res.json(data)
  } catch (e) { next(e) }
})

r.delete('/roles/:id', async (req, res, next) => {
  try {
    if (!guard(req, res)) return
    const { data: before, error: readError } = await admin.from('access_roles').select('*').eq('id', req.params.id).single()
    if (readError) throw readError
    if (before.is_system) return res.status(409).json({ error: 'System roles cannot be deleted. You can edit their permissions instead.' })
    const { count, error: countError } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('access_role_id', req.params.id)
    if (countError) throw countError
    if (Number(count || 0) > 0) return res.status(409).json({ error: 'This role is assigned to users. Reassign those users before deleting it.' })
    const { error } = await admin.from('access_roles').delete().eq('id', req.params.id)
    if (error) throw error
    await audit(req, 'delete', 'access_roles', req.params.id, before, null)
    res.status(204).end()
  } catch (e) { next(e) }
})

export default r
