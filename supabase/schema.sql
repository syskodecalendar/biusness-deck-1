create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('super_admin','management','finance','project_manager','viewer')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email),'viewer') on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), legacy_id integer unique,
  company_name text not null, contact_person text, email text, phone text,
  address1 text, address2 text, country text, state text, city text, fax text,
  cr_number text, vat_number text, currency text default 'BHD', description text,
  zoho_customer_id text unique, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(), legacy_id integer unique,
  company_name text not null, contact_person text, email text, phone text,
  address1 text, address2 text, country text, state text, city text, fax text,
  cr_number text, vat_number text, bank_details text, services text, payment_terms text,
  description text, zoho_vendor_id text unique, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), legacy_id integer unique,
  project_code text unique not null, project_name text not null,
  client_id uuid references public.clients(id) on delete restrict,
  reference_no text, contract_signed_date date, start_date date, expected_end_date date, actual_end_date date,
  contact_person text, phone text, address text, description text,
  contract_value numeric(18,3) not null default 0, variations numeric(18,3) not null default 0,
  tax_name text, tax_percentage numeric(8,3) not null default 0, tax_amount numeric(18,3) not null default 0,
  currency text not null default 'BHD', project_status text not null default 'in_progress',
  payment_status text not null default 'not_invoiced', project_manager uuid references public.profiles(id),
  zoho_project_ref text, legacy_status text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_projects_client on public.projects(client_id);

create table if not exists public.project_vendors (
  id uuid primary key default gen_random_uuid(), legacy_id integer unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete restrict,
  scope text, reference_no text, contract_amount numeric(18,3) not null default 0,
  tax_name text, tax_amount numeric(18,3) not null default 0, total_amount numeric(18,3) not null default 0,
  start_date date, due_date date, payment_terms text, status text not null default 'assigned',
  legacy_status text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_project_vendors_project on public.project_vendors(project_id);
create index if not exists idx_project_vendors_vendor on public.project_vendors(vendor_id);

create table if not exists public.client_invoices (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null, invoice_number text,
  invoice_date date, due_date date, subtotal numeric(18,3) default 0, tax_amount numeric(18,3) default 0,
  total_amount numeric(18,3) default 0, balance numeric(18,3) default 0,
  status text default 'draft', source text default 'manual', zoho_invoice_id text unique,
  raw_payload jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.client_receipts (
  id uuid primary key default gen_random_uuid(), legacy_id integer unique,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  invoice_id uuid references public.client_invoices(id) on delete set null,
  amount numeric(18,3) not null default 0, payment_date date not null,
  payment_method text, reference_number text, remarks text, tax_mode text, tax_percentage numeric(8,3) default 0,
  tax_amount numeric(18,3) default 0, source text not null default 'manual', zoho_payment_id text unique,
  legacy_status text, is_active boolean not null default true, created_at timestamptz not null default now()
);
create index if not exists idx_client_receipts_project on public.client_receipts(project_id);

create table if not exists public.vendor_bills (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null, project_vendor_id uuid references public.project_vendors(id) on delete set null,
  bill_number text, bill_date date, due_date date, subtotal numeric(18,3) default 0, tax_amount numeric(18,3) default 0,
  total_amount numeric(18,3) default 0, balance numeric(18,3) default 0, status text default 'open',
  source text default 'manual', zoho_bill_id text unique, raw_payload jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.vendor_payments (
  id uuid primary key default gen_random_uuid(), legacy_id integer unique,
  project_id uuid references public.projects(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  project_vendor_id uuid references public.project_vendors(id) on delete set null,
  bill_id uuid references public.vendor_bills(id) on delete set null,
  amount numeric(18,3) not null default 0, payment_date date not null,
  payment_method text, reference_number text, remarks text, tax_mode text, tax_percentage numeric(8,3) default 0,
  tax_amount numeric(18,3) default 0, source text not null default 'manual', zoho_payment_id text unique,
  legacy_status text, is_active boolean not null default true, created_at timestamptz not null default now()
);
create index if not exists idx_vendor_payments_project on public.vendor_payments(project_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(), legacy_id integer unique,
  project_id uuid references public.projects(id) on delete set null,
  category text, description text, amount numeric(18,3) not null default 0,
  expense_date date not null, paid_to text, payment_method text, reference_number text,
  tax_mode text, tax_percentage numeric(8,3) default 0, tax_amount numeric(18,3) default 0,
  source text not null default 'manual', legacy_status text, is_active boolean not null default true, created_at timestamptz not null default now()
);
create index if not exists idx_expenses_project on public.expenses(project_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null, project_vendor_id uuid references public.project_vendors(id) on delete cascade,
  category text not null default 'other', file_name text not null, storage_path text not null,
  mime_type text, file_size bigint, uploaded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create table if not exists public.zoho_connections (
  id uuid primary key default gen_random_uuid(), organization_id text unique not null,
  access_token text, refresh_token text, expires_at timestamptz, scope text, connected_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.zoho_sync_logs (
  id uuid primary key default gen_random_uuid(), entity_type text, zoho_id text, action text,
  status text, message text, payload jsonb, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), action text not null,
  entity_type text, entity_id text, before_data jsonb, after_data jsonb, ip_address text, created_at timestamptz not null default now()
);

create or replace view public.project_financials as
select p.id, p.project_code, p.project_name, p.client_id, p.project_status, p.payment_status,
  case when coalesce((select sum(r.amount) from public.client_receipts r where r.project_id=p.id and r.is_active=true),0)<=0 then 'unpaid' when coalesce((select sum(r.amount) from public.client_receipts r where r.project_id=p.id and r.is_active=true),0)>=(p.contract_value+p.variations+p.tax_amount) then 'paid' else 'partially_paid' end as computed_payment_status,
  (p.contract_value+p.variations+p.tax_amount)::numeric(18,3) as gross_project_value,
  coalesce((select sum(r.amount) from public.client_receipts r where r.project_id=p.id and r.is_active=true),0)::numeric(18,3) as received,
  greatest((p.contract_value+p.variations+p.tax_amount)-coalesce((select sum(r.amount) from public.client_receipts r where r.project_id=p.id and r.is_active=true),0),0)::numeric(18,3) as receivable,
  coalesce((select sum(pv.total_amount) from public.project_vendors pv where pv.project_id=p.id and pv.status<>'cancelled'),0)::numeric(18,3) as vendor_cost,
  coalesce((select sum(vp.amount) from public.vendor_payments vp where vp.project_id=p.id and vp.is_active=true),0)::numeric(18,3) as vendor_paid,
  greatest(coalesce((select sum(pv.total_amount) from public.project_vendors pv where pv.project_id=p.id and pv.status<>'cancelled'),0)-coalesce((select sum(vp.amount) from public.vendor_payments vp where vp.project_id=p.id and vp.is_active=true),0),0)::numeric(18,3) as vendor_payable,
  coalesce((select sum(e.amount) from public.expenses e where e.project_id=p.id and e.is_active=true),0)::numeric(18,3) as other_expenses,
  ((p.contract_value+p.variations+p.tax_amount)-coalesce((select sum(pv.total_amount) from public.project_vendors pv where pv.project_id=p.id and pv.status<>'cancelled'),0)-coalesce((select sum(e.amount) from public.expenses e where e.project_id=p.id and e.is_active=true),0))::numeric(18,3) as projected_margin,
  (coalesce((select sum(r.amount) from public.client_receipts r where r.project_id=p.id and r.is_active=true),0)-coalesce((select sum(vp.amount) from public.vendor_payments vp where vp.project_id=p.id and vp.is_active=true),0)-coalesce((select sum(e.amount) from public.expenses e where e.project_id=p.id and e.is_active=true),0))::numeric(18,3) as realized_margin
from public.projects p;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.vendors enable row level security;
alter table public.projects enable row level security;
alter table public.project_vendors enable row level security;
alter table public.client_invoices enable row level security;
alter table public.client_receipts enable row level security;
alter table public.vendor_bills enable row level security;
alter table public.vendor_payments enable row level security;
alter table public.expenses enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles self read" on public.profiles for select to authenticated using (id=auth.uid());
-- Business data is intentionally accessed through the Node service role API. No direct client policies are created.

-- Syskode Business Deck V2.2 - configurable roles, column visibility and row scopes
create table if not exists public.access_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  column_permissions jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists access_role_id uuid references public.access_roles(id) on delete set null;
alter table public.profiles add column if not exists data_scope text not null default 'all';
alter table public.profiles add column if not exists linked_vendor_id uuid references public.vendors(id) on delete set null;
alter table public.profiles add column if not exists linked_client_id uuid references public.clients(id) on delete set null;
alter table public.profiles add column if not exists allowed_project_ids uuid[] not null default '{}'::uuid[];

do $$ begin
  alter table public.profiles add constraint profiles_data_scope_check check (data_scope in ('all','vendor','client','projects','own_projects'));
exception when duplicate_object then null; end $$;

insert into public.access_roles(name,code,description,permissions,column_permissions,is_system) values
('Super Admin','super_admin','Full system access including users, roles, finance and integrations',
 '{"dashboard":{"view":true},"projects":{"view":true,"create":true,"edit":true,"delete":true},"clients":{"view":true,"create":true,"edit":true,"delete":true},"vendors":{"view":true,"create":true,"edit":true,"delete":true},"project_vendors":{"view":true,"create":true,"edit":true,"delete":true},"transactions":{"view":true},"client_invoices":{"view":true,"create":true,"edit":true,"delete":true},"client_receipts":{"view":true,"create":true,"edit":true,"delete":true},"vendor_bills":{"view":true,"create":true,"edit":true,"delete":true},"vendor_payments":{"view":true,"create":true,"edit":true,"delete":true},"expenses":{"view":true,"create":true,"edit":true,"delete":true},"documents":{"view":true,"create":true,"edit":true,"delete":true,"download":true},"reports":{"view":true,"export":true},"zoho":{"view":true,"sync":true},"audit":{"view":true},"users":{"view":true,"create":true,"edit":true,"delete":true},"roles":{"view":true,"create":true,"edit":true,"delete":true}}'::jsonb,
 '{}'::jsonb,true),
('Management','management','Full operational and financial access without user/role administration',
 '{"dashboard":{"view":true},"projects":{"view":true,"create":true,"edit":true,"delete":true},"clients":{"view":true,"create":true,"edit":true,"delete":true},"vendors":{"view":true,"create":true,"edit":true,"delete":true},"project_vendors":{"view":true,"create":true,"edit":true,"delete":true},"transactions":{"view":true},"client_invoices":{"view":true,"create":true,"edit":true,"delete":true},"client_receipts":{"view":true,"create":true,"edit":true,"delete":true},"vendor_bills":{"view":true,"create":true,"edit":true,"delete":true},"vendor_payments":{"view":true,"create":true,"edit":true,"delete":true},"expenses":{"view":true,"create":true,"edit":true,"delete":true},"documents":{"view":true,"create":true,"edit":true,"delete":true,"download":true},"reports":{"view":true,"export":true},"zoho":{"view":true,"sync":true},"audit":{"view":true}}'::jsonb,
 '{}'::jsonb,true),
('Finance','finance','Finance-focused operations and reporting',
 '{"dashboard":{"view":true},"projects":{"view":true},"clients":{"view":true,"create":true,"edit":true},"vendors":{"view":true,"create":true,"edit":true},"transactions":{"view":true},"client_invoices":{"view":true,"create":true,"edit":true,"delete":true},"client_receipts":{"view":true,"create":true,"edit":true,"delete":true},"vendor_bills":{"view":true,"create":true,"edit":true,"delete":true},"vendor_payments":{"view":true,"create":true,"edit":true,"delete":true},"expenses":{"view":true,"create":true,"edit":true,"delete":true},"documents":{"view":true,"create":true,"edit":true,"delete":true,"download":true},"reports":{"view":true,"export":true},"zoho":{"view":true,"sync":true}}'::jsonb,
 '{}'::jsonb,true),
('Project Manager','project_manager','Project delivery, clients, vendors and documents',
 '{"dashboard":{"view":true},"projects":{"view":true,"create":true,"edit":true,"delete":true},"clients":{"view":true,"create":true,"edit":true},"vendors":{"view":true,"create":true,"edit":true},"project_vendors":{"view":true,"create":true,"edit":true,"delete":true},"documents":{"view":true,"create":true,"edit":true,"delete":true,"download":true}}'::jsonb,
 '{}'::jsonb,true),
('Viewer','viewer','Read-only internal access',
 '{"dashboard":{"view":true},"projects":{"view":true},"clients":{"view":true},"vendors":{"view":true},"project_vendors":{"view":true},"transactions":{"view":true},"client_invoices":{"view":true},"client_receipts":{"view":true},"vendor_bills":{"view":true},"vendor_payments":{"view":true},"expenses":{"view":true},"documents":{"view":true,"download":true},"reports":{"view":true}}'::jsonb,
 '{}'::jsonb,true),
('Vendor Portal','vendor_portal','Restricted portal role intended for subcontractors/vendors',
 '{"dashboard":{"view":true},"projects":{"view":true},"vendors":{"view":true},"project_vendors":{"view":true},"transactions":{"view":true},"vendor_bills":{"view":true},"vendor_payments":{"view":true},"documents":{"view":true,"download":true}}'::jsonb,
 '{"dashboard":["total_projects","vendor_cost","vendor_paid","vendor_payable"],"project_financials":["project_code","project_name","project_status","vendor_cost","vendor_paid","vendor_payable"],"projects":["project_code","project_name","reference_no","start_date","expected_end_date","project_status","description"],"vendors":["company_name","contact_person","email","phone","services","payment_terms","status"],"project_vendors":["project_code","project_name","vendor_name","scope","reference_no","contract_amount","tax_amount","total_amount","start_date","due_date","payment_terms","status"],"vendor_bills":["bill_date","due_date","project_code","project_name","vendor_name","bill_number","total_amount","balance","status"],"vendor_payments":["payment_date","project_code","project_name","vendor_name","bill_number_link","amount","payment_method","reference_number","remarks"],"documents":["file_name","category","mime_type","file_size","created_at"]}'::jsonb,true),
('Client Portal','client_portal','Restricted portal role intended for selected clients',
 '{"dashboard":{"view":true},"projects":{"view":true},"clients":{"view":true},"transactions":{"view":true},"client_invoices":{"view":true},"client_receipts":{"view":true}}'::jsonb,
 '{"dashboard":["total_projects","gross_project_value","received","receivable"],"project_financials":["project_code","project_name","project_status","payment_status","gross_project_value","received","receivable"],"projects":["project_code","project_name","reference_no","contract_value","tax_amount","currency","start_date","expected_end_date","project_status","payment_status","description"],"clients":["company_name","contact_person","email","phone","address1","address2","city","country","vat_number","status"],"client_invoices":["invoice_date","due_date","project_code","project_name","client_name","invoice_number","total_amount","balance","status"],"client_receipts":["payment_date","project_code","project_name","client_name","invoice_number_link","amount","payment_method","reference_number","remarks"]}'::jsonb,true)
on conflict(code) do update set
  name=excluded.name,
  description=excluded.description,
  is_system=true,
  updated_at=now();

update public.profiles p
set access_role_id=r.id
from public.access_roles r
where p.access_role_id is null and r.code=p.role;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare viewer_role uuid;
begin
  select id into viewer_role from public.access_roles where code='viewer' limit 1;
  insert into public.profiles(id,full_name,role,access_role_id,data_scope)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email),'viewer',viewer_role,'all')
  on conflict(id) do nothing;
  return new;
end; $$;

alter table public.access_roles enable row level security;
-- access_roles and all business data remain server-only via the Node service key.
