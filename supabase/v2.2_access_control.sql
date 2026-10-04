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
