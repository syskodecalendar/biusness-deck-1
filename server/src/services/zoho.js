import axios from 'axios';
import crypto from 'crypto';
import { admin } from '../lib.js';
import { config } from '../config.js';
import { encrypt, decrypt } from './crypto.js';

const z = config.zoho;

function stateSecret() {
  return process.env.APP_ENCRYPTION_KEY || 'dev-only-change-me';
}

export function makeState() {
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', stateSecret()).update(ts).digest('hex');
  return `${ts}.${sig}`;
}

export function verifyState(state) {
  if (!state) return false;
  const [ts, sig] = String(state).split('.');
  if (!ts || !sig || Date.now() - Number(ts) > 10 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', stateSecret()).update(ts).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function authUrl() {
  const p = new URLSearchParams({
    scope: 'ZohoBooks.fullaccess.all',
    client_id: z.clientId || '',
    response_type: 'code',
    access_type: 'offline',
    redirect_uri: z.redirectUri || '',
    prompt: 'consent',
    state: makeState()
  });
  return `${z.accountsUrl}/oauth/v2/auth?${p}`;
}

export async function exchangeCode(code) {
  const p = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: z.clientId,
    client_secret: z.clientSecret,
    redirect_uri: z.redirectUri,
    code
  });
  const { data } = await axios.post(`${z.accountsUrl}/oauth/v2/token`, p);
  if (data.error) throw new Error(data.error);
  await admin.from('zoho_connections').upsert({
    organization_id: z.orgId,
    access_token: encrypt(data.access_token),
    refresh_token: encrypt(data.refresh_token),
    expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    scope: data.scope,
    updated_at: new Date().toISOString()
  }, { onConflict: 'organization_id' });
  return data;
}

async function connection() {
  const { data, error } = await admin.from('zoho_connections')
    .select('*')
    .eq('organization_id', z.orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Zoho Books is not connected');
  return data;
}

async function token() {
  const c = await connection();
  if (new Date(c.expires_at).getTime() > Date.now() + 60000) return decrypt(c.access_token);
  const p = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: z.clientId,
    client_secret: z.clientSecret,
    refresh_token: decrypt(c.refresh_token)
  });
  const { data } = await axios.post(`${z.accountsUrl}/oauth/v2/token`, p);
  if (data.error) throw new Error(data.error);
  await admin.from('zoho_connections').update({
    access_token: encrypt(data.access_token),
    expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', c.id);
  return data.access_token;
}

async function api(path, params = {}) {
  const t = await token();
  const { data } = await axios.get(`${z.apiBase}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${t}` },
    params: { organization_id: z.orgId, ...params }
  });
  return data;
}

function cleanCode(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/SK-[A-Z0-9][A-Z0-9-]*/i);
  return (match ? match[0] : text).trim();
}

function projectCodeCandidates(obj = {}) {
  const values = [];
  const fields = obj.custom_fields || [];
  for (const f of fields) {
    const name = String(f.api_name || f.label || '').toLowerCase().replace(/[\s_-]/g, '');
    if (name.includes('projectcode')) values.push(f.value);
  }

  // Zoho invoices display this as P.O.#. Different API payloads/versions may expose
  // slightly different property names, so accept all common variants.
  for (const key of [
    'purchaseorder', 'purchase_order', 'purchaseorder_number', 'purchase_order_number',
    'po_number', 'po_no', 'reference_number'
  ]) {
    if (obj[key]) values.push(obj[key]);
  }

  // Safe fallback: if an SK-* project code is present in another shallow string field,
  // recognize it rather than losing a valid invoice because Zoho renamed a field.
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && /SK-[A-Z0-9][A-Z0-9-]*/i.test(value)) values.push(value);
  }

  return [...new Set(values.map(cleanCode).filter(Boolean))];
}

async function projectByCode(code) {
  if (!code) return null;
  const { data, error } = await admin.from('projects')
    .select('id,client_id,project_code,project_name')
    .eq('project_code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function projectFromObject(obj) {
  for (const code of projectCodeCandidates(obj)) {
    const project = await projectByCode(code);
    if (project) return project;
  }
  return null;
}

async function clientByZoho(id) {
  if (!id) return null;
  const { data } = await admin.from('clients').select('id').eq('zoho_customer_id', id).maybeSingle();
  return data?.id || null;
}

async function vendorByZoho(id) {
  if (!id) return null;
  const { data } = await admin.from('vendors').select('id').eq('zoho_vendor_id', id).maybeSingle();
  return data?.id || null;
}

async function invoiceRecord({ invoiceId, invoiceNumber } = {}) {
  let q = admin.from('client_invoices').select('id,project_id,client_id,invoice_number,zoho_invoice_id');
  if (invoiceId) q = q.eq('zoho_invoice_id', String(invoiceId));
  else if (invoiceNumber) q = q.eq('invoice_number', String(invoiceNumber));
  else return null;
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

async function projectById(id) {
  if (!id) return null;
  const { data, error } = await admin.from('projects')
    .select('id,client_id,project_code,project_name')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function hydrateInvoice(summary) {
  let invoice = summary;
  let project = await projectFromObject(invoice);
  if (!project && summary?.invoice_id) {
    const detail = await api(`/invoices/${summary.invoice_id}`);
    invoice = detail.invoice || summary;
    project = await projectFromObject(invoice);
  }
  return { invoice, project };
}

async function ensureInvoiceSynced(summary) {
  const { invoice, project } = await hydrateInvoice(summary);
  if (!project) {
    throw new Error(`Unmapped invoice ${invoice.invoice_number || invoice.invoice_id}: project code missing. Use Project Code or P.O.# with a Business Deck project code.`);
  }
  const clientId = await clientByZoho(invoice.customer_id) || project.client_id;
  const { data, error } = await admin.from('client_invoices').upsert({
    project_id: project.id,
    client_id: clientId,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.date || null,
    due_date: invoice.due_date || null,
    subtotal: invoice.sub_total || 0,
    tax_amount: invoice.tax_total || 0,
    total_amount: invoice.total || 0,
    balance: invoice.balance || 0,
    status: invoice.status,
    source: 'zoho',
    zoho_invoice_id: invoice.invoice_id,
    raw_payload: invoice,
    updated_at: new Date().toISOString()
  }, { onConflict: 'zoho_invoice_id' }).select('id,project_id,client_id,invoice_number,zoho_invoice_id').single();
  if (error) throw error;
  return { invoice, project, record: data };
}

async function resolveReceipt(summary) {
  // 1) If somebody put a Project Code directly on the payment, respect it.
  let project = await projectFromObject(summary);
  let linkedInvoice = null;
  let payment = summary;

  // 2) Zoho's list-customer-payments response normally exposes invoice_number.
  // Use the already-synced invoice to inherit the Business Deck project.
  if (!project && summary.invoice_number) {
    linkedInvoice = await invoiceRecord({ invoiceNumber: summary.invoice_number });
    if (linkedInvoice) project = await projectById(linkedInvoice.project_id);
  }

  // 3) If the list response is not enough, retrieve the payment detail. Zoho returns
  // an invoices[] array there, including invoice_id/invoice_number/amount_applied.
  if (!project && summary.payment_id) {
    const detail = await api(`/customerpayments/${summary.payment_id}`);
    payment = detail.payment || summary;
    for (const linked of payment.invoices || []) {
      linkedInvoice = await invoiceRecord({ invoiceId: linked.invoice_id, invoiceNumber: linked.invoice_number });
      if (!linkedInvoice && linked.invoice_id) {
        try {
          const invoiceDetail = await api(`/invoices/${linked.invoice_id}`);
          const synced = await ensureInvoiceSynced(invoiceDetail.invoice || { invoice_id: linked.invoice_id, invoice_number: linked.invoice_number });
          linkedInvoice = synced.record;
        } catch {
          // Keep trying other linked invoices; the final error below will be clearer.
        }
      }
      if (linkedInvoice) {
        project = await projectById(linkedInvoice.project_id);
        if (project) break;
      }
    }
  }

  if (!project) {
    throw new Error(`Unmapped customer payment ${summary.payment_id || ''}: no linked Business Deck project could be resolved from its invoice.`);
  }
  return { payment, project, linkedInvoice };
}

async function syncEntity(type, o) {
  if (type === 'invoices') {
    const { invoice } = await ensureInvoiceSynced(o);
    await log(type, invoice.invoice_id, 'success', `Synced invoice ${invoice.invoice_number || ''}`, invoice);
    return;
  }

  if (type === 'receipts') {
    const { payment, project, linkedInvoice } = await resolveReceipt(o);
    const clientId = await clientByZoho(payment.customer_id) || linkedInvoice?.client_id || project.client_id;
    const { error } = await admin.from('client_receipts').upsert({
      project_id: project.id,
      client_id: clientId,
      invoice_id: linkedInvoice?.id || null,
      amount: payment.amount || o.amount || 0,
      payment_date: payment.date || o.date || new Date().toISOString().slice(0, 10),
      payment_method: payment.payment_mode || o.payment_mode,
      reference_number: payment.reference_number || o.reference_number || payment.invoice_number || o.invoice_number,
      remarks: payment.description || o.description,
      source: 'zoho',
      zoho_payment_id: payment.payment_id || o.payment_id,
      is_active: true
    }, { onConflict: 'zoho_payment_id' });
    if (error) throw error;
    await log(type, payment.payment_id || o.payment_id, 'success', `Synced payment to ${project.project_code}`, payment);
    return;
  }

  const project = await projectFromObject(o);
  if (!project) throw new Error(`Unmapped project code: ${projectCodeCandidates(o)[0] || 'missing'}`);

  if (type === 'bills') {
    const vendorId = await vendorByZoho(o.vendor_id);
    const { error } = await admin.from('vendor_bills').upsert({
      project_id: project.id,
      vendor_id: vendorId,
      bill_number: o.bill_number,
      bill_date: o.date || null,
      due_date: o.due_date || null,
      subtotal: o.sub_total || 0,
      tax_amount: o.tax_total || 0,
      total_amount: o.total || 0,
      balance: o.balance || 0,
      status: o.status,
      source: 'zoho',
      zoho_bill_id: o.bill_id,
      raw_payload: o,
      updated_at: new Date().toISOString()
    }, { onConflict: 'zoho_bill_id' });
    if (error) throw error;
  }

  if (type === 'vendorPayments') {
    const vendorId = await vendorByZoho(o.vendor_id);
    const { error } = await admin.from('vendor_payments').upsert({
      project_id: project.id,
      vendor_id: vendorId,
      amount: o.amount || 0,
      payment_date: o.date || new Date().toISOString().slice(0, 10),
      payment_method: o.payment_mode,
      reference_number: o.reference_number,
      remarks: o.description,
      source: 'zoho',
      zoho_payment_id: o.payment_id,
      is_active: true
    }, { onConflict: 'zoho_payment_id' });
    if (error) throw error;
  }

  await log(type, o.invoice_id || o.bill_id || o.payment_id, 'success', 'Synced', o);
}

export async function syncAll() {
  const stats = { invoices: 0, receipts: 0, bills: 0, vendorPayments: 0, unmapped: 0 };
  const groups = [
    ['/invoices', 'invoices', 'invoices'],
    ['/customerpayments', 'receipts', 'customerpayments'],
    ['/bills', 'bills', 'bills'],
    ['/vendorpayments', 'vendorPayments', 'vendorpayments']
  ];

  for (const [path, key, items] of groups) {
    let page = 1;
    let more = true;
    while (more && page <= 100) {
      const d = await api(path, { page, per_page: 200 });
      for (const o of d[items] || []) {
        const id = o.invoice_id || o.bill_id || o.payment_id || '';
        try {
          await syncEntity(key, o);
          stats[key]++;
        } catch (e) {
          stats.unmapped++;
          await log(key, id, 'error', e.message, o);
        }
      }
      more = Boolean(d.page_context?.has_more_page);
      page++;
    }
  }
  return stats;
}

async function log(type, id, status, message, payload) {
  await admin.from('zoho_sync_logs').insert({
    entity_type: type,
    zoho_id: String(id || ''),
    action: 'sync',
    status,
    message,
    payload
  });
}

export async function syncEvent(payload) {
  // Current implementation performs an idempotent reconciliation pass so webhook
  // events and manual Sync Now always converge to the same data.
  return syncAll();
}
