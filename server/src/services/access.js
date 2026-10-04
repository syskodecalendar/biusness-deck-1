import { admin } from '../lib.js'

export const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

export const permissionCatalog = {
  dashboard: ['view'],
  projects: ['view', 'create', 'edit', 'delete'],
  clients: ['view', 'create', 'edit', 'delete'],
  vendors: ['view', 'create', 'edit', 'delete'],
  project_vendors: ['view', 'create', 'edit', 'delete'],
  transactions: ['view'],
  client_invoices: ['view', 'create', 'edit', 'delete'],
  client_receipts: ['view', 'create', 'edit', 'delete'],
  vendor_bills: ['view', 'create', 'edit', 'delete'],
  vendor_payments: ['view', 'create', 'edit', 'delete'],
  expenses: ['view', 'create', 'edit', 'delete'],
  documents: ['view', 'create', 'edit', 'delete', 'download'],
  reports: ['view', 'export'],
  zoho: ['view', 'sync'],
  audit: ['view'],
  users: ['view', 'create', 'edit', 'delete'],
  roles: ['view', 'create', 'edit', 'delete']
}

export const columnCatalog = {
  dashboard: [
    ['total_projects', 'Total Projects'], ['total_clients', 'Total Clients'], ['total_vendors', 'Total Vendors'], ['gross_project_value', 'Total Project Value'], ['received', 'Total Received'],
    ['receivable', 'Total Receivable'], ['vendor_cost', 'Vendor Cost'], ['vendor_paid', 'Vendors Paid'],
    ['vendor_payable', 'Vendors Payable'], ['other_expenses', 'Other Expenses'], ['projected_margin', 'Projected Margin'],
    ['realized_margin', 'Realized Margin']
  ],
  project_financials: [
    ['project_code', 'Project Code'], ['project_name', 'Project'], ['client_name', 'Client'], ['project_status', 'Project Status'],
    ['payment_status', 'Payment Status'], ['gross_project_value', 'Project Value'], ['received', 'Received'], ['receivable', 'Receivable'],
    ['vendor_cost', 'Vendor Cost'], ['vendor_paid', 'Vendor Paid'], ['vendor_payable', 'Vendor Payable'],
    ['other_expenses', 'Other Expenses'], ['projected_margin', 'Projected Margin'], ['realized_margin', 'Realized Margin']
  ],
  projects: [
    ['project_code', 'Project Code'], ['project_name', 'Project Name'], ['client_name', 'Client'], ['reference_no', 'Reference / PO'],
    ['contract_value', 'Contract Value'], ['variations', 'Variations'], ['tax_amount', 'Tax'], ['currency', 'Currency'],
    ['contract_signed_date', 'Contract Date'], ['start_date', 'Start Date'], ['expected_end_date', 'Expected End'],
    ['actual_end_date', 'Actual End'], ['project_status', 'Project Status'], ['payment_status', 'Payment Status'],
    ['description', 'Description'], ['created_at', 'Created']
  ],
  clients: [
    ['company_name', 'Company'], ['contact_person', 'Contact Person'], ['email', 'Email'], ['phone', 'Phone'],
    ['address1', 'Address 1'], ['address2', 'Address 2'], ['city', 'City'], ['state', 'State'], ['country', 'Country'],
    ['cr_number', 'CR Number'], ['vat_number', 'VAT Number'], ['currency', 'Currency'], ['description', 'Notes'], ['status', 'Status']
  ],
  vendors: [
    ['company_name', 'Company'], ['contact_person', 'Contact Person'], ['email', 'Email'], ['phone', 'Phone'],
    ['address1', 'Address 1'], ['address2', 'Address 2'], ['city', 'City'], ['state', 'State'], ['country', 'Country'],
    ['cr_number', 'CR Number'], ['vat_number', 'VAT Number'], ['services', 'Services'], ['payment_terms', 'Payment Terms'],
    ['bank_details', 'Bank Details'], ['description', 'Notes'], ['status', 'Status']
  ],
  project_vendors: [
    ['project_code', 'Project Code'], ['project_name', 'Project'], ['vendor_name', 'Vendor'], ['scope', 'Scope'], ['reference_no', 'Reference'],
    ['contract_amount', 'Contract Amount'], ['tax_amount', 'Tax'], ['total_amount', 'Total'], ['start_date', 'Start Date'],
    ['due_date', 'Due Date'], ['payment_terms', 'Payment Terms'], ['status', 'Status']
  ],
  client_invoices: [
    ['invoice_date', 'Invoice Date'], ['due_date', 'Due Date'], ['project_code', 'Project Code'], ['project_name', 'Project'],
    ['client_name', 'Client'], ['invoice_number', 'Invoice'], ['subtotal', 'Subtotal'], ['tax_amount', 'Tax'], ['total_amount', 'Total'],
    ['balance', 'Balance'], ['status', 'Status'], ['source', 'Source']
  ],
  client_receipts: [
    ['payment_date', 'Payment Date'], ['project_code', 'Project Code'], ['project_name', 'Project'], ['client_name', 'Client'],
    ['invoice_number_link', 'Invoice'], ['amount', 'Amount'], ['payment_method', 'Method'], ['reference_number', 'Reference'],
    ['remarks', 'Remarks'], ['source', 'Source']
  ],
  vendor_bills: [
    ['bill_date', 'Bill Date'], ['due_date', 'Due Date'], ['project_code', 'Project Code'], ['project_name', 'Project'],
    ['vendor_name', 'Vendor'], ['bill_number', 'Bill'], ['subtotal', 'Subtotal'], ['tax_amount', 'Tax'], ['total_amount', 'Total'],
    ['balance', 'Balance'], ['status', 'Status'], ['source', 'Source']
  ],
  vendor_payments: [
    ['payment_date', 'Payment Date'], ['project_code', 'Project Code'], ['project_name', 'Project'], ['vendor_name', 'Vendor'],
    ['bill_number_link', 'Bill'], ['amount', 'Amount'], ['payment_method', 'Method'], ['reference_number', 'Reference'],
    ['remarks', 'Remarks'], ['source', 'Source']
  ],
  expenses: [
    ['expense_date', 'Expense Date'], ['project_code', 'Project Code'], ['project_name', 'Project'], ['category', 'Category'],
    ['description', 'Description'], ['amount', 'Amount'], ['paid_to', 'Paid To'], ['payment_method', 'Method'],
    ['reference_number', 'Reference'], ['source', 'Source']
  ],
  documents: [['file_name', 'File Name'], ['category', 'Category'], ['vendor_name', 'Vendor'], ['mime_type', 'Type'], ['file_size', 'Size'], ['created_at', 'Uploaded']],
  users: [['full_name', 'Name'], ['email', 'Email'], ['role_name', 'Role'], ['status', 'Status'], ['data_scope', 'Data Scope'], ['last_sign_in_at', 'Last Sign In']],
  audit: [['created_at', 'Time'], ['user_name', 'User'], ['action', 'Action'], ['entity_type', 'Entity'], ['entity_id', 'Record'], ['ip_address', 'IP']],
  zoho_logs: [['created_at', 'Time'], ['entity_type', 'Entity'], ['zoho_id', 'Zoho ID'], ['status', 'Status'], ['message', 'Message']]
}

const allPermissions = Object.fromEntries(Object.entries(permissionCatalog).map(([k, actions]) => [k, Object.fromEntries(actions.map(a => [a, true]))]))

const legacy = {
  super_admin: allPermissions,
  management: { ...allPermissions, users: { view: false }, roles: { view: false } },
  finance: {
    dashboard: { view: true }, projects: { view: true }, clients: { view: true, create: true, edit: true }, vendors: { view: true, create: true, edit: true },
    transactions: { view: true }, client_invoices: { view: true, create: true, edit: true, delete: true }, client_receipts: { view: true, create: true, edit: true, delete: true },
    vendor_bills: { view: true, create: true, edit: true, delete: true }, vendor_payments: { view: true, create: true, edit: true, delete: true }, expenses: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, create: true, edit: true, delete: true, download: true }, reports: { view: true, export: true }, zoho: { view: true, sync: true }
  },
  project_manager: {
    dashboard: { view: true }, projects: { view: true, create: true, edit: true, delete: true }, clients: { view: true, create: true, edit: true }, vendors: { view: true, create: true, edit: true },
    project_vendors: { view: true, create: true, edit: true, delete: true }, documents: { view: true, create: true, edit: true, delete: true, download: true }
  },
  viewer: {
    dashboard: { view: true }, projects: { view: true }, clients: { view: true }, vendors: { view: true }, project_vendors: { view: true },
    transactions: { view: true }, client_invoices: { view: true }, client_receipts: { view: true }, vendor_bills: { view: true }, vendor_payments: { view: true }, expenses: { view: true },
    documents: { view: true, download: true }, reports: { view: true }
  }
}

export function isSuperAdmin(req) {
  return req.profile?.role === 'super_admin' || req.accessRole?.code === 'super_admin'
}

export function permissionsFor(req) {
  if (isSuperAdmin(req)) return allPermissions
  return req.accessRole?.permissions || legacy[req.profile?.role] || legacy.viewer
}

export function can(req, resource, action = 'view') {
  if (isSuperAdmin(req)) return true
  return permissionsFor(req)?.[resource]?.[action] === true
}

export function columnsFor(req, resource) {
  if (isSuperAdmin(req)) return ['*']
  const cols = req.accessRole?.column_permissions?.[resource]
  if (!Array.isArray(cols)) return ['*']
  return cols
}

export function publicAccess(req) {
  return {
    role: req.accessRole ? { id: req.accessRole.id, name: req.accessRole.name, code: req.accessRole.code } : { id: null, name: req.profile?.role || 'Viewer', code: req.profile?.role || 'viewer' },
    permissions: permissionsFor(req),
    columns: req.accessRole?.column_permissions || {},
    scope: {
      type: req.profile?.data_scope || 'all',
      vendor_id: req.profile?.linked_vendor_id || null,
      client_id: req.profile?.linked_client_id || null,
      project_ids: req.profile?.allowed_project_ids || []
    }
  }
}

export async function scopedProjectIds(req) {
  if (req._scopedProjectIds !== undefined) return req._scopedProjectIds
  const type = req.profile?.data_scope || 'all'
  if (type === 'all') return (req._scopedProjectIds = null)
  let ids = []
  if (type === 'vendor' && req.profile?.linked_vendor_id) {
    const { data, error } = await admin.from('project_vendors').select('project_id').eq('vendor_id', req.profile.linked_vendor_id).neq('status', 'cancelled')
    if (error) throw error
    ids = [...new Set((data || []).map(x => x.project_id).filter(Boolean))]
  } else if (type === 'client' && req.profile?.linked_client_id) {
    const { data, error } = await admin.from('projects').select('id').eq('client_id', req.profile.linked_client_id)
    if (error) throw error
    ids = (data || []).map(x => x.id)
  } else if (type === 'projects') {
    ids = Array.isArray(req.profile?.allowed_project_ids) ? req.profile.allowed_project_ids : []
  } else if (type === 'own_projects') {
    const { data, error } = await admin.from('projects').select('id').eq('project_manager', req.user.id)
    if (error) throw error
    ids = (data || []).map(x => x.id)
  }
  req._scopedProjectIds = ids
  return ids
}

async function scopedClientIds(req) {
  const type = req.profile?.data_scope || 'all'
  if (type === 'all') return null
  if (type === 'client') return req.profile?.linked_client_id ? [req.profile.linked_client_id] : []
  if (type === 'vendor') return []
  const pids = await scopedProjectIds(req)
  if (!pids?.length) return []
  const { data, error } = await admin.from('projects').select('client_id').in('id', pids)
  if (error) throw error
  return [...new Set((data || []).map(x => x.client_id).filter(Boolean))]
}

async function scopedVendorIds(req) {
  const type = req.profile?.data_scope || 'all'
  if (type === 'all') return null
  if (type === 'vendor') return req.profile?.linked_vendor_id ? [req.profile.linked_vendor_id] : []
  const pids = await scopedProjectIds(req)
  if (!pids?.length) return []
  const { data, error } = await admin.from('project_vendors').select('vendor_id').in('project_id', pids)
  if (error) throw error
  return [...new Set((data || []).map(x => x.vendor_id).filter(Boolean))]
}

function applyIds(q, field, ids) {
  if (ids === null) return q
  return ids.length ? q.in(field, ids) : q.eq(field, ZERO_UUID)
}

export async function applyScope(q, req, table) {
  // Supabase query builders are thenable. Never return a builder directly from an
  // async function, because Promise resolution would execute the query and callers
  // would receive the response object instead of the builder. Wrap it instead.
  const wrap = query => ({ query })
  const type = req.profile?.data_scope || 'all'
  if (type === 'all' || isSuperAdmin(req)) return wrap(q)
  if (table === 'projects' || table === 'project_financials') return wrap(applyIds(q, 'id', await scopedProjectIds(req)))
  if (table === 'clients') return wrap(applyIds(q, 'id', await scopedClientIds(req)))
  if (table === 'vendors') return wrap(applyIds(q, 'id', await scopedVendorIds(req)))
  if (table === 'project_vendors') {
    if (type === 'vendor') {
      const projectIds = await scopedProjectIds(req)
      q = q.eq('vendor_id', req.profile?.linked_vendor_id || ZERO_UUID).neq('status', 'cancelled')
      return wrap(applyIds(q, 'project_id', projectIds))
    }
    return wrap(applyIds(q, 'project_id', await scopedProjectIds(req)))
  }
  if (table === 'vendor_bills' || table === 'vendor_payments') {
    if (type === 'vendor') {
      const projectIds = await scopedProjectIds(req)
      q = q.eq('vendor_id', req.profile?.linked_vendor_id || ZERO_UUID)
      return wrap(applyIds(q, 'project_id', projectIds))
    }
    return wrap(applyIds(q, 'project_id', await scopedProjectIds(req)))
  }
  if (table === 'client_invoices' || table === 'client_receipts') {
    if (type === 'client') return wrap(q.eq('client_id', req.profile?.linked_client_id || ZERO_UUID))
    return wrap(applyIds(q, 'project_id', await scopedProjectIds(req)))
  }
  if (table === 'expenses') return wrap(applyIds(q, 'project_id', await scopedProjectIds(req)))
  if (table === 'documents') {
    if (type === 'vendor') {
      const projectIds = await scopedProjectIds(req)
      q = q.eq('vendor_id', req.profile?.linked_vendor_id || ZERO_UUID)
      return wrap(applyIds(q, 'project_id', projectIds))
    }
    return wrap(applyIds(q, 'project_id', await scopedProjectIds(req)))
  }
  return wrap(q)
}

export async function projectAllowed(req, projectId) {
  if (isSuperAdmin(req) || (req.profile?.data_scope || 'all') === 'all') return true
  const ids = await scopedProjectIds(req)
  return ids.includes(projectId)
}

const controlKeys = new Set(['id', 'project_id', 'client_id', 'vendor_id', 'project_vendor_id', 'invoice_id', 'bill_id', 'source', 'is_active'])
const virtual = {
  client_name: ['clients', 'company_name'], vendor_name: ['vendors', 'company_name'], project_name: ['projects', 'project_name'],
  project_code: ['projects', 'project_code'], invoice_number_link: ['client_invoices', 'invoice_number'], bill_number_link: ['vendor_bills', 'bill_number'],
  user_name: ['profiles', 'full_name']
}

export function filterRow(req, resource, row) {
  if (!row || typeof row !== 'object') return row
  const cols = columnsFor(req, resource)
  if (cols.includes('*')) return row
  const out = {}
  for (const k of controlKeys) if (row[k] !== undefined) out[k] = row[k]
  for (const key of cols) {
    if (key === 'payment_status' && row.computed_payment_status !== undefined) out.computed_payment_status = row.computed_payment_status
    // Prefer a real column on the current row. Some names (project_name,
    // project_code, etc.) can also be virtual relationship columns on other
    // resources; treating them as virtual first stripped them from Project and
    // project_financials rows for restricted roles such as Vendor Portal.
    if (row[key] !== undefined) {
      out[key] = row[key]
      continue
    }
    const v = virtual[key]
    if (v) {
      const [rel, field] = v
      if (row[rel] && row[rel][field] !== undefined) out[rel] = { ...(out[rel] || {}), [field]: row[rel][field] }
    }
  }
  return out
}

export function filterRows(req, resource, rows) { return (rows || []).map(row => filterRow(req, resource, row)) }

export async function scopeFinancialRows(req, rows) {
  const list = rows || []
  if (!list.length || isSuperAdmin(req) || (req.profile?.data_scope || 'all') !== 'vendor') return list
  const vendorId = req.profile?.linked_vendor_id
  if (!vendorId) return list.map(row => ({ ...row, vendor_cost: 0, vendor_paid: 0, vendor_payable: 0 }))
  const projectIds = [...new Set(list.map(row => row.id).filter(Boolean))]
  if (!projectIds.length) return list
  const [{ data: assignments, error: assignmentError }, { data: payments, error: paymentError }] = await Promise.all([
    admin.from('project_vendors').select('project_id,total_amount,status').eq('vendor_id', vendorId).in('project_id', projectIds),
    admin.from('vendor_payments').select('project_id,amount,is_active').eq('vendor_id', vendorId).eq('is_active', true).in('project_id', projectIds)
  ])
  if (assignmentError) throw assignmentError
  if (paymentError) throw paymentError
  const costByProject = {}
  const paidByProject = {}
  for (const row of assignments || []) {
    if (row.status === 'cancelled') continue
    costByProject[row.project_id] = (costByProject[row.project_id] || 0) + Number(row.total_amount || 0)
  }
  for (const row of payments || []) paidByProject[row.project_id] = (paidByProject[row.project_id] || 0) + Number(row.amount || 0)
  return list.map(row => {
    const vendor_cost = costByProject[row.id] || 0
    const vendor_paid = paidByProject[row.id] || 0
    return { ...row, vendor_cost, vendor_paid, vendor_payable: Math.max(vendor_cost - vendor_paid, 0) }
  })
}

export async function recordAllowed(req, table, row) {
  if (!row || isSuperAdmin(req) || (req.profile?.data_scope || 'all') === 'all') return Boolean(row)
  const type = req.profile?.data_scope || 'all'
  if (table === 'projects' || table === 'project_financials') return projectAllowed(req, row.id)
  if (table === 'clients') {
    const ids = await scopedClientIds(req)
    return ids?.includes(row.id) || false
  }
  if (table === 'vendors') {
    const ids = await scopedVendorIds(req)
    return ids?.includes(row.id) || false
  }
  if (table === 'project_vendors') {
    if (type === 'vendor') return row.vendor_id === req.profile?.linked_vendor_id && row.status !== 'cancelled' && Boolean(row.project_id) && await projectAllowed(req, row.project_id)
    return projectAllowed(req, row.project_id)
  }
  if (table === 'vendor_bills' || table === 'vendor_payments') {
    if (type === 'vendor') return row.vendor_id === req.profile?.linked_vendor_id && Boolean(row.project_id) && await projectAllowed(req, row.project_id)
    return row.project_id ? projectAllowed(req, row.project_id) : false
  }
  if (table === 'client_invoices' || table === 'client_receipts') {
    if (type === 'client') return row.client_id === req.profile?.linked_client_id
    return row.project_id ? projectAllowed(req, row.project_id) : false
  }
  if (table === 'expenses') return row.project_id ? projectAllowed(req, row.project_id) : false
  if (table === 'documents') {
    if (type === 'vendor') return row.vendor_id === req.profile?.linked_vendor_id && Boolean(row.project_id) && await projectAllowed(req, row.project_id)
    return row.project_id ? projectAllowed(req, row.project_id) : false
  }
  return false
}
