import { Router } from 'express'
import crypto from 'crypto'
import { admin } from '../lib.js'
import { pageParams, clean } from '../utils/query.js'
import { audit } from '../services/audit.js'
import { applyScope, can, filterRow, filterRows, isSuperAdmin, projectAllowed, recordAllowed } from '../services/access.js'

const r = Router()

const defs = {
  clients: { search: ['company_name', 'contact_person', 'email'], order: 'company_name', resource: 'clients' },
  vendors: { search: ['company_name', 'contact_person', 'email'], order: 'company_name', resource: 'vendors' },
  projects: { search: ['project_name', 'project_code', 'reference_no'], order: 'created_at', select: '*, clients(company_name)', resource: 'projects' },
  'project-vendors': { table: 'project_vendors', order: 'created_at', select: '*, vendors(company_name), projects(project_name,project_code)', resource: 'project_vendors' },
  'client-receipts': { table: 'client_receipts', order: 'payment_date', select: '*, projects(project_name,project_code), clients(company_name), client_invoices(invoice_number)', resource: 'client_receipts' },
  'vendor-payments': { table: 'vendor_payments', order: 'payment_date', select: '*, projects(project_name,project_code), vendors(company_name), vendor_bills(bill_number)', resource: 'vendor_payments' },
  expenses: { order: 'expense_date', select: '*, projects(project_name,project_code)', resource: 'expenses' },
  'client-invoices': { table: 'client_invoices', order: 'invoice_date', select: '*, projects(project_name,project_code), clients(company_name)', resource: 'client_invoices' },
  'vendor-bills': { table: 'vendor_bills', order: 'bill_date', select: '*, projects(project_name,project_code), vendors(company_name)', resource: 'vendor_bills' }
}

const softDeleteTables = new Set(['client_receipts', 'vendor_payments', 'expenses'])
const updatedAtTables = new Set(['clients', 'vendors', 'projects', 'project_vendors', 'client_invoices', 'vendor_bills'])
const recentCreates = new Map()

function duplicateCreate(req, table, payload) {
  const now = Date.now()
  for (const [key, time] of recentCreates) if (now - time > 10_000) recentCreates.delete(key)
  const fingerprint = crypto.createHash('sha256').update(`${req.user?.id || 'anonymous'}|${table}|${JSON.stringify(payload)}`).digest('hex')
  const previous = recentCreates.get(fingerprint)
  if (previous && now - previous < 3_000) return true
  recentCreates.set(fingerprint, now)
  return false
}

function guard(req, res, resource, action) {
  if (can(req, resource, action)) return true
  res.status(403).json({ error: `Your role does not allow ${action} access to this section.` })
  return false
}

function mutationError(res, error) {
  if (error?.code === '23503') return res.status(409).json({ error: 'This record is used by other records. Remove or reassign the linked records first.' })
  if (error?.code === '23505') return res.status(409).json({ error: 'A record with the same unique value already exists.' })
  throw error
}

async function linkedProjectFinancialCount(projectId) {
  const tables = ['client_invoices', 'client_receipts', 'vendor_bills', 'vendor_payments', 'expenses']
  let total = 0
  for (const table of tables) {
    const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('project_id', projectId)
    if (error) throw error
    total += Number(count || 0)
  }
  return total
}

async function createScopeAllowed(req, table, payload) {
  if (isSuperAdmin(req) || (req.profile?.data_scope || 'all') === 'all') return true
  const type = req.profile?.data_scope || 'all'
  if (table === 'projects') {
    if (type === 'client') return payload.client_id === req.profile?.linked_client_id
    if (type === 'own_projects') { payload.project_manager = req.user.id; return true }
    return false
  }
  if (table === 'clients') return type === 'client' && payload.id === req.profile?.linked_client_id
  if (table === 'vendors') return type === 'vendor' && payload.id === req.profile?.linked_vendor_id
  if (table === 'vendor_bills' || table === 'vendor_payments' || table === 'project_vendors') {
    if (type === 'vendor') return payload.vendor_id === req.profile?.linked_vendor_id && Boolean(payload.project_id) && await projectAllowed(req, payload.project_id)
    return payload.project_id ? projectAllowed(req, payload.project_id) : false
  }
  if (table === 'client_invoices' || table === 'client_receipts') {
    if (type === 'client') return payload.client_id === req.profile?.linked_client_id && Boolean(payload.project_id) && await projectAllowed(req, payload.project_id)
    return payload.project_id ? projectAllowed(req, payload.project_id) : false
  }
  if (payload.project_id) return projectAllowed(req, payload.project_id)
  return false
}

for (const [path, d] of Object.entries(defs)) {
  const table = d.table || path
  const resource = d.resource || table
  const base = `/${path}`

  r.get(base, async (req, res, next) => {
    try {
      if (!guard(req, res, resource, 'view')) return
      const { page, limit, from, to } = pageParams(req)
      let q = admin.from(table).select(d.select || '*', { count: 'exact' })
      q = (await applyScope(q, req, table)).query
      if (softDeleteTables.has(table) && req.query.include_inactive !== 'true') q = q.eq('is_active', true)
      if (req.query.project_id) q = q.eq('project_id', req.query.project_id)
      if (req.query.vendor_id) q = q.eq('vendor_id', req.query.vendor_id)
      if (req.query.client_id) q = q.eq('client_id', req.query.client_id)
      if (req.query.status) q = q.eq(path === 'projects' ? 'project_status' : 'status', req.query.status)
      q = q.order(d.order || 'created_at', { ascending: false }).range(from, to)
      const { data, error, count } = await q
      if (error) throw error
      res.json({ data: filterRows(req, resource, data), count, page, limit })
    } catch (e) { next(e) }
  })

  r.get(`${base}/:id`, async (req, res, next) => {
    try {
      if (!guard(req, res, resource, 'view')) return
      const { data, error } = await admin.from(table).select(d.select || '*').eq('id', req.params.id).single()
      if (error) throw error
      if (!(await recordAllowed(req, table, data))) return res.status(404).json({ error: 'Record not found' })
      res.json(filterRow(req, resource, data))
    } catch (e) { next(e) }
  })

  r.post(base, async (req, res, next) => {
    try {
      if (!guard(req, res, resource, 'create')) return
      const payload = clean(req.body)
      if (!(await createScopeAllowed(req, table, payload))) return res.status(403).json({ error: 'The new record is outside your assigned data scope.' })
      if (duplicateCreate(req, table, payload)) return res.status(409).json({ error: 'Duplicate submission ignored. The first save is already being processed.' })
      const { data, error } = await admin.from(table).insert(payload).select().single()
      if (error) return mutationError(res, error)
      await audit(req, 'create', table, data.id, null, data)
      res.status(201).json(filterRow(req, resource, data))
    } catch (e) { next(e) }
  })

  r.put(`${base}/:id`, async (req, res, next) => {
    try {
      if (!guard(req, res, resource, 'edit')) return
      const { data: before } = await admin.from(table).select('*').eq('id', req.params.id).maybeSingle()
      if (!before || !(await recordAllowed(req, table, before))) return res.status(404).json({ error: 'Record not found' })
      if (before.source === 'zoho') return res.status(409).json({ error: 'Zoho-synced records are read-only in Business Deck. Update them in Zoho Books and sync again.' })
      const updatePayload = clean(req.body)
      const scopedCandidate = { ...before, ...updatePayload }
      if (!(await recordAllowed(req, table, scopedCandidate))) return res.status(403).json({ error: 'This change would move the record outside your assigned data scope.' })
      if (updatedAtTables.has(table)) updatePayload.updated_at = new Date().toISOString()
      const { data, error } = await admin.from(table).update(updatePayload).eq('id', req.params.id).select().single()
      if (error) return mutationError(res, error)
      await audit(req, 'update', table, data.id, before, data)
      res.json(filterRow(req, resource, data))
    } catch (e) { next(e) }
  })

  if (softDeleteTables.has(table)) {
    r.patch(`${base}/:id/active`, async (req, res, next) => {
      try {
        if (!guard(req, res, resource, 'edit')) return
        const { data: before } = await admin.from(table).select('*').eq('id', req.params.id).maybeSingle()
        if (!before || !(await recordAllowed(req, table, before))) return res.status(404).json({ error: 'Record not found' })
        if (before.source === 'zoho') return res.status(409).json({ error: 'Zoho-synced records cannot be activated/deactivated manually.' })
        const isActive = req.body?.is_active !== false
        const { data, error } = await admin.from(table).update({ is_active: isActive }).eq('id', req.params.id).select().single()
        if (error) throw error
        await audit(req, isActive ? 'restore' : 'deactivate', table, data.id, before, data)
        res.json(filterRow(req, resource, data))
      } catch (e) { next(e) }
    })
  }

  r.delete(`${base}/:id`, async (req, res, next) => {
    try {
      if (!guard(req, res, resource, 'delete')) return
      const { data: before } = await admin.from(table).select('*').eq('id', req.params.id).maybeSingle()
      if (!before || !(await recordAllowed(req, table, before))) return res.status(404).json({ error: 'Record not found' })
      if (before.source === 'zoho') return res.status(409).json({ error: 'Zoho-synced records cannot be deleted in Business Deck. Void/delete them in Zoho Books and sync again.' })
      if (table === 'projects') {
        const linked = await linkedProjectFinancialCount(req.params.id)
        if (linked > 0) return res.status(409).json({ error: 'This project has financial history. Remove/correct its linked finance records before deleting the project.' })
      }
      if (softDeleteTables.has(table) && req.query.hard !== 'true') {
        const { data, error } = await admin.from(table).update({ is_active: false }).eq('id', req.params.id).select().single()
        if (error) throw error
        await audit(req, 'deactivate', table, data.id, before, data)
        return res.json({ deleted: false, deactivated: true, data: filterRow(req, resource, data) })
      }
      const { error } = await admin.from(table).delete().eq('id', req.params.id)
      if (error) return mutationError(res, error)
      await audit(req, 'delete', table, req.params.id, before, null)
      res.status(204).end()
    } catch (e) { next(e) }
  })
}

export default r
