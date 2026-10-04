import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value || value.includes('YOUR_PROJECT') || value.includes('YOUR_SERVICE_ROLE_KEY')) {
    throw new Error(`${name} is missing or still contains the example placeholder. Update server/.env.`);
  }
  return value;
}

const supabaseUrl = requireEnv('SUPABASE_URL');
const adminKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!adminKey) {
  throw new Error('Missing Supabase admin key. Set SUPABASE_SECRET_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY in server/.env.');
}
if (adminKey.startsWith('sb_publishable_')) {
  throw new Error('The server admin key is a publishable key. Use a Supabase Secret key (sb_secret_...) instead.');
}
if (process.env.SUPABASE_ANON_KEY && adminKey === String(process.env.SUPABASE_ANON_KEY).trim()) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY currently matches SUPABASE_ANON_KEY. An anon key cannot bypass RLS. Use a Secret/service_role key.');
}

// Legacy service_role keys are JWTs. Detect an accidentally pasted anon JWT before making writes.
if (adminKey.startsWith('eyJ')) {
  try {
    const payload = JSON.parse(Buffer.from(adminKey.split('.')[1], 'base64url').toString('utf8'));
    if (payload.role && payload.role !== 'service_role') {
      throw new Error(`The supplied legacy JWT has role "${payload.role}", not "service_role". Use the service_role key.`);
    }
  } catch (error) {
    if (String(error.message || '').includes('not "service_role"')) throw error;
  }
}

const supabase = createClient(supabaseUrl, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function verifyAdminKey() {
  const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    throw new Error(
      `Supabase admin-key check failed: ${error.message}. ` +
      'Open Supabase Dashboard → Settings → API Keys and use a Secret key (sb_secret_...) ' +
      'or the legacy service_role key. Do not use the publishable/anon key.'
    );
  }
}

const source = JSON.parse(fs.readFileSync(path.join(root, 'legacy/legacy-export.json'), 'utf8'));
const active = s => String(s || '').toLowerCase() === 'active' ? 'active' : 'inactive';
const projStatus = s => String(s || '').toLowerCase().includes('deactiv') ? 'cancelled' : 'in_progress';
const safeDate = v => !v || String(v).startsWith('0000-00-00') ? null : String(v).slice(0, 10);
const safeTs = v => !v || String(v).startsWith('0000-00-00') ? new Date().toISOString() : String(v).replace(' ', 'T') + 'Z';
const taxPct = name => { const m = String(name || '').match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; };

async function upsert(table, rows, onConflict = 'legacy_id', chunk = 200) {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    process.stdout.write(`\r${table}: ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
  console.log();
}
async function maps(table) {
  const { data, error } = await supabase.from(table).select('id,legacy_id');
  if (error) throw error;
  return new Map(data.map(x => [Number(x.legacy_id), x.id]));
}

async function main() {
  await verifyAdminKey();
  console.log('Supabase admin key verified. Starting idempotent legacy import...');

  await upsert('clients', source.clients.map(x => ({ legacy_id:x.company_id, company_name:x.company_name||`Legacy Client ${x.company_id}`, contact_person:x.contact_person, email:x.contact_email, phone:x.contact_phone, address1:x.contact_address_1, address2:x.contact_address_2, country:x.country, state:x.state, city:x.city, fax:x.fax, description:x.description, status:active(x.status), created_at:safeTs(x.default_date) })));
  const clientMap = await maps('clients');
  await upsert('vendors', source.vendors.map(x => ({ legacy_id:x.sub_company_id, company_name:x.sub_company_name||`Legacy Vendor ${x.sub_company_id}`, contact_person:x.sub_contact_person, email:x.sub_contact_email, phone:x.sub_contact_phone, address1:x.sub_contact_address_1, address2:x.sub_contact_address_2, country:x.sub_country, state:x.sub_state, city:x.sub_city, fax:x.sub_fax, description:x.sub_description, status:active(x.sub_status), created_at:safeTs(x.sub_default_date) })));
  const vendorMap = await maps('vendors');
  await upsert('projects', source.projects.map(x => ({ legacy_id:x.project_id, project_code:`SK-LEGACY-${String(x.project_id).padStart(4,'0')}`, project_name:x.project_name||`Legacy Project ${x.project_id}`, client_id:clientMap.get(Number(x.company_id))||null, reference_no:x.reference_no, contract_signed_date:safeDate(x.contract_signed_date), contact_person:x.contact_person, phone:x.phone_number, address:x.address, description:x.project_description, contract_value:Number(x.contract_value||0), variations:Number(x.variations||0), tax_name:x.tax_name, tax_percentage:taxPct(x.tax_name), tax_amount:Number(x.tax_value||0), project_status:projStatus(x.project_status), legacy_status:x.project_status, created_at:safeTs(x.default_date) })));
  const projectMap = await maps('projects');
  await upsert('project_vendors', source.project_vendors.filter(x => projectMap.has(Number(x.project_id))).map(x => ({ legacy_id:x.subwork_id, project_id:projectMap.get(Number(x.project_id)), vendor_id:vendorMap.get(Number(x.sub_company_id))||null, scope:x.description||x.project_name, reference_no:x.project_reference_no, contract_amount:Number(x.amount||0), tax_name:x.tax_name, tax_amount:Number(x.tax_value||0), total_amount:Number(x.vat_added_amnt||x.amount||0), status:String(x.subwork_status||'').toLowerCase()==='active'?'assigned':'cancelled', legacy_status:x.subwork_status, created_at:safeTs(x.default_date) })));
  const projectVendorMap = await maps('project_vendors');
  const receipts = [], vendorPayments = [], expenses = [];
  for (const x of source.transactions) {
    if (!projectMap.has(Number(x.project_id))) continue;
    const common = { legacy_id:x.transaction_id, project_id:projectMap.get(Number(x.project_id)), tax_mode:x.tax_mode, tax_percentage:Number(x.tax_percentage||0), tax_amount:Number(x.tax_amount||0), source:'migration', legacy_status:x.status, is_active:String(x.status||'').toLowerCase()==='active', created_at:safeTs(x.default_date) };
    if (String(x.account_type).toLowerCase().includes('income')) {
      receipts.push({ ...common, client_id:clientMap.get(Number(x.company_id))||null, amount:Number(x.income||0), payment_date:safeDate(x.transaction_date)||new Date().toISOString().slice(0,10), remarks:x.remarks, payment_method:'Legacy / Unspecified', reference_number:x.account_head_name });
    } else {
      const isVendor = Number(x.sub_contractor_id||0)>0 || String(x.account_head_name||'').toLowerCase().includes('vendor payment');
      if (isVendor) vendorPayments.push({ ...common, vendor_id:vendorMap.get(Number(x.sub_contractor_id))||null, project_vendor_id:projectVendorMap.get(Number(x.subwork_id))||null, amount:Number(x.expense||0), payment_date:safeDate(x.transaction_date)||new Date().toISOString().slice(0,10), remarks:x.remarks, payment_method:'Legacy / Unspecified', reference_number:x.account_head_name });
      else expenses.push({ ...common, category:x.account_head_name||'Legacy Expense', description:x.remarks, amount:Number(x.expense||0), expense_date:safeDate(x.transaction_date)||new Date().toISOString().slice(0,10), paid_to:x.sub_contractor_name&&x.sub_contractor_name!=='NA'?x.sub_contractor_name:null, payment_method:'Legacy / Unspecified', reference_number:x.account_head_name });
    }
  }
  await upsert('client_receipts', receipts);
  await upsert('vendor_payments', vendorPayments);
  await upsert('expenses', expenses);
  console.log({ clients:source.clients.length, projects:source.projects.length, vendors:source.vendors.length, projectVendors:source.project_vendors.length, receipts:receipts.length, vendorPayments:vendorPayments.length, expenses:expenses.length });
}

main().catch(e => { console.error(`\nImport failed: ${e.message || e}`); process.exit(1); });
