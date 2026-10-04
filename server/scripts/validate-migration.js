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

const base = JSON.parse(fs.readFileSync(path.join(root, 'legacy/validation-baseline.json'), 'utf8'));
const sum = (rows, k) => Number((rows || []).reduce((a, x) => a + Number(x[k] || 0), 0).toFixed(3));

async function main() {
  await verifyAdminKey();
  const [{data:p,error:pe},{data:f,error:fe},{data:pv,error:pve},{data:r,error:re},{data:vp,error:vpe},{data:e,error:ee}] = await Promise.all([
    supabase.from('projects').select('id,project_status'),
    supabase.from('project_financials').select('*'),
    supabase.from('project_vendors').select('total_amount,status'),
    supabase.from('client_receipts').select('amount,is_active'),
    supabase.from('vendor_payments').select('amount,is_active'),
    supabase.from('expenses').select('amount,is_active')
  ]);
  for (const er of [pe,fe,pve,re,vpe,ee]) if (er) throw er;
  const activeF=(f||[]).filter(x=>x.project_status!=='cancelled');
  const actual={
    total_projects_all:p.length,
    active_projects:p.filter(x=>x.project_status!=='cancelled').length,
    active_project_gross_value:sum(activeF,'gross_project_value'),
    active_income:sum(r.filter(x=>x.is_active),'amount'),
    active_vendor_committed:sum(pv.filter(x=>x.status!=='cancelled'),'total_amount'),
    active_expense:sum(vp.filter(x=>x.is_active),'amount')+sum(e.filter(x=>x.is_active),'amount')
  };
  console.table(Object.keys(actual).map(k=>({metric:k,legacy:base[k],v2:actual[k],match:Math.abs(Number(base[k])-Number(actual[k]))<.01})));
}

main().catch(e => { console.error(`\nValidation failed: ${e.message || e}`); process.exit(1); });
