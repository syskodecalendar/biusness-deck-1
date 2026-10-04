import { Router } from 'express'
import { admin } from '../lib.js'
import { applyScope, can, columnsFor, filterRows, scopeFinancialRows } from '../services/access.js'

const r = Router()
r.get('/', async (req, res, next) => {
  try {
    if (!can(req, 'dashboard', 'view')) return res.status(403).json({ error: 'Dashboard access is not enabled for your role.' })
    let projectQuery = admin.from('project_financials').select('*').order('project_name')
    projectQuery = (await applyScope(projectQuery, req, 'project_financials')).query
    let clientQuery = admin.from('clients').select('id', { count: 'exact' })
    clientQuery = (await applyScope(clientQuery, req, 'clients')).query
    let vendorQuery = admin.from('vendors').select('id', { count: 'exact' })
    vendorQuery = (await applyScope(vendorQuery, req, 'vendors')).query
    const [{ data: rows, error }, { count: clientsCount }, { count: vendorsCount }] = await Promise.all([projectQuery, clientQuery, vendorQuery])
    if (error) throw error
    const scopedRows = await scopeFinancialRows(req, rows || [])
    const financialRows = scopedRows.filter(x => x.project_status !== 'cancelled')
    const sums = financialRows.reduce((a, x) => {
      for (const k of ['gross_project_value', 'received', 'receivable', 'vendor_cost', 'vendor_paid', 'vendor_payable', 'other_expenses', 'projected_margin', 'realized_margin']) a[k] += Number(x[k] || 0)
      return a
    }, { gross_project_value: 0, received: 0, receivable: 0, vendor_cost: 0, vendor_paid: 0, vendor_payable: 0, other_expenses: 0, projected_margin: 0, realized_margin: 0 })
    const allKpis = { total_projects: scopedRows.length, total_clients: clientsCount || 0, total_vendors: vendorsCount || 0, ...sums }
    const visible = columnsFor(req, 'dashboard')
    const kpis = visible.includes('*') ? allKpis : Object.fromEntries(Object.entries(allKpis).filter(([k]) => visible.includes(k)))
    res.json({ kpis, projects: filterRows(req, 'project_financials', scopedRows) })
  } catch (e) { next(e) }
})
export default r
