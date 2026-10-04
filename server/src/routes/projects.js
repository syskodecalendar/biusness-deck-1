import { Router } from 'express'
import { admin } from '../lib.js'
import { applyScope, can, filterRow, filterRows, projectAllowed, scopeFinancialRows } from '../services/access.js'

const r = Router()
r.get('/:id/summary', async (req, res, next) => {
  try {
    const id = req.params.id
    if (!can(req, 'projects', 'view') || !(await projectAllowed(req, id))) return res.status(404).json({ error: 'Project not found' })

    const p = await admin.from('projects').select('*, clients(company_name)').eq('id', id).single()
    if (p.error) throw p.error
    let financials = null
    if (can(req, 'dashboard', 'view') || can(req, 'reports', 'view')) {
      const f = await admin.from('project_financials').select('*').eq('id', id).single()
      if (!f.error) {
        const [scopedFinancial] = await scopeFinancialRows(req, [f.data])
        financials = filterRow(req, 'project_financials', scopedFinancial)
      }
    }

    async function scoped(table, select, resource, orderField, activeOnly = false) {
      if (!can(req, resource, 'view')) return []
      let q = admin.from(table).select(select).eq('project_id', id)
      q = (await applyScope(q, req, table)).query
      if (activeOnly) q = q.eq('is_active', true)
      if (orderField) q = q.order(orderField, { ascending: false })
      const { data, error } = await q
      if (error) throw error
      return filterRows(req, resource, data || [])
    }

    const [projectVendors, clientReceipts, vendorPayments, expenses, documents, clientInvoices, vendorBills] = await Promise.all([
      scoped('project_vendors', '*,vendors(company_name)', 'project_vendors', 'created_at'),
      scoped('client_receipts', '*,clients(company_name),client_invoices(invoice_number)', 'client_receipts', 'payment_date', true),
      scoped('vendor_payments', '*,vendors(company_name),vendor_bills(bill_number)', 'vendor_payments', 'payment_date', true),
      scoped('expenses', '*', 'expenses', 'expense_date', true),
      scoped('documents', '*,vendors(company_name)', 'documents', 'created_at'),
      scoped('client_invoices', '*', 'client_invoices', 'invoice_date'),
      scoped('vendor_bills', '*,vendors(company_name)', 'vendor_bills', 'bill_date')
    ])

    res.json({
      project: filterRow(req, 'projects', p.data),
      financials,
      projectVendors,
      clientReceipts,
      vendorPayments,
      expenses,
      documents,
      clientInvoices,
      vendorBills
    })
  } catch (e) { next(e) }
})
export default r
