import { Router } from 'express'
import ExcelJS from 'exceljs'
import { admin } from '../lib.js'
import { applyScope, can, columnCatalog, columnsFor, scopeFinancialRows } from '../services/access.js'

const r = Router()

async function profitability(req) {
  let q = admin.from('project_financials').select('*').order('project_name')
  q = (await applyScope(q, req, 'project_financials')).query
  const { data, error } = await q
  if (error) throw error
  const scopedRows = await scopeFinancialRows(req, data || [])
  const ids = [...new Set(scopedRows.map(x => x.client_id).filter(Boolean))]
  let clients = {}
  if (ids.length) {
    const { data: c } = await admin.from('clients').select('id,company_name').in('id', ids)
    clients = Object.fromEntries((c || []).map(x => [x.id, x.company_name]))
  }
  return scopedRows.map(x => ({ ...x, client_name: clients[x.client_id] || '' }))
}
async function receivables(req) { return (await profitability(req)).filter(x => Number(x.receivable) > 0) }
async function payables(req) { return (await profitability(req)).filter(x => Number(x.vendor_payable) > 0) }
const sources = { profitability, receivables, payables }

function visibleRows(req, rows) {
  const cols = columnsFor(req, 'project_financials')
  if (cols.includes('*')) return rows
  return rows.map(row => Object.fromEntries(Object.entries(row).filter(([k]) => k === 'id' || cols.includes(k))))
}

r.get('/:type', async (req, res, next) => {
  try {
    if (!can(req, 'reports', 'view')) return res.status(403).json({ error: 'Reports access is not enabled for your role.' })
    const fn = sources[req.params.type]
    if (!fn) return res.status(404).json({ error: 'Unknown report' })
    res.json(visibleRows(req, await fn(req)))
  } catch (e) { next(e) }
})

r.get('/:type/export', async (req, res, next) => {
  try {
    if (!can(req, 'reports', 'export')) return res.status(403).json({ error: 'Excel export is not enabled for your role.' })
    const fn = sources[req.params.type]
    if (!fn) return res.status(404).json({ error: 'Unknown report' })
    const rows = visibleRows(req, await fn(req))
    const visible = columnsFor(req, 'project_financials')
    const labelMap = Object.fromEntries(columnCatalog.project_financials)
    const defaults = req.params.type === 'profitability'
      ? ['project_code','project_name','client_name','gross_project_value','received','receivable','vendor_cost','vendor_paid','vendor_payable','other_expenses','projected_margin','realized_margin']
      : req.params.type === 'receivables'
        ? ['project_code','project_name','client_name','gross_project_value','received','receivable']
        : ['project_code','project_name','vendor_cost','vendor_paid','vendor_payable']
    const keys = defaults.filter(k => visible.includes('*') || visible.includes(k))
    const wb = new ExcelJS.Workbook(); wb.creator = 'Syskode Business Deck'
    const ws = wb.addWorksheet(req.params.type.slice(0, 31))
    ws.columns = keys.map(key => ({ key, header: labelMap[key] || key, width: 22 }))
    ws.getRow(1).font = { bold: true }
    rows.forEach(row => ws.addRow(row))
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="syskode-${req.params.type}-${new Date().toISOString().slice(0,10)}.xlsx"`)
    await wb.xlsx.write(res); res.end()
  } catch (e) { next(e) }
})
export default r
