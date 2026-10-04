import { Router } from 'express'
import { admin } from '../lib.js'
import { can, filterRows } from '../services/access.js'
const r = Router()
r.get('/', async (req, res, next) => {
  try {
    if (!can(req, 'audit', 'view')) return res.status(403).json({ error: 'Audit access is not enabled for your role.' })
    const { data, error } = await admin.from('audit_logs').select('*,profiles(full_name)').order('created_at', { ascending: false }).limit(1000)
    if (error) throw error
    res.json(filterRows(req, 'audit', data || []))
  } catch (e) { next(e) }
})
export default r
