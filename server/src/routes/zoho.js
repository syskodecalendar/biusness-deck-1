import { Router } from 'express'
import { config } from '../config.js'
import { admin } from '../lib.js'
import { authUrl, syncAll } from '../services/zoho.js'
import { can, filterRows } from '../services/access.js'
const r = Router()
r.get('/status', async (req, res, next) => {
  try {
    if (!can(req, 'zoho', 'view')) return res.status(403).json({ error: 'Zoho Books access is not enabled for your role.' })
    const { data } = await admin.from('zoho_connections').select('organization_id,expires_at,updated_at').eq('organization_id', config.zoho.orgId).maybeSingle()
    const { data: logs } = await admin.from('zoho_sync_logs').select('*').order('created_at', { ascending: false }).limit(200)
    res.json({ connected: !!data, connection: data, logs: filterRows(req, 'zoho_logs', logs || []) })
  } catch (e) { next(e) }
})
r.get('/auth-url', (req, res) => {
  if (!can(req, 'zoho', 'sync')) return res.status(403).json({ error: 'Zoho connection is not enabled for your role.' })
  res.json({ url: authUrl() })
})
r.post('/sync', async (req, res, next) => {
  try {
    if (!can(req, 'zoho', 'sync')) return res.status(403).json({ error: 'Zoho sync is not enabled for your role.' })
    res.json(await syncAll())
  } catch (e) { next(e) }
})
export default r
