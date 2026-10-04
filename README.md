# Syskode Business Deck V2.2.2

Internal project finance, client, subcontractor, transaction, document, reporting and Zoho Books management system for Syskode Technologies W.L.L.

## Stack
- React 18 + Vite + JSX/JavaScript
- Node.js + Express
- Supabase PostgreSQL, Auth and private Storage
- ExcelJS exports
- Zoho Books OAuth/API sync
- Light Syskode-style interface

## V2.2 highlights
- Configurable Roles & Access
- Module/page access per role
- Create/Edit/Delete/Export/Sync action permissions
- Per-table/per-report column visibility
- Server-side field filtering for restricted roles
- Per-user record scopes: all, one vendor, one client, selected projects, own projects
- Built-in Vendor Portal and Client Portal roles
- Vendor-specific financial totals on shared projects
- Search across all returned fields on every major list/detail page
- Sorting across all major tables
- Double-submit protection in UI + API
- Full CRUD from V2.1 retained
- Zoho Books project/payment sync retained


## V2.2.2 vendor portal hardening
- Fixed Project Name / Project Code visibility for restricted roles.
- Vendor accounts are now enforced as one linked vendor per login.
- Vendor scope requires a current non-cancelled project assignment.
- Vendor bills, payments and documents are constrained by both vendor and project assignment.
- Vendor Portal / Client Portal user scope is locked to the matching linked entity.

## Access model
Access has two independent layers:

### 1. Role
Controls **what the user can do and see**:
- page/module visibility
- CRUD actions
- export/sync/download actions
- visible table/financial columns

### 2. Data Scope
Controls **which records the user can access**:
- `all` - all records allowed by their role
- `vendor` - only one linked vendor and that vendor's projects/finance/documents
- `client` - only one linked client and that client's projects/invoices/receipts
- `projects` - only explicitly selected projects
- `own_projects` - projects where the user is project manager

The Node API applies the scope before returning data. Hiding a menu/table column alone is not relied on for security.

## Vendor portal example
Use:
- Role: `Vendor Portal`
- Data Scope: `One linked vendor`
- Linked Vendor: selected subcontractor

Then customize the Vendor Portal role's visible columns in **Roles & Access**. A vendor-scoped user sees only its own assignments, bills, payments and vendor-linked documents. Vendor cost/paid/payable values are calculated only for that linked vendor.

## Existing V2.1.x database upgrade
Run once in Supabase SQL Editor:

`supabase/v2.2_access_control.sql`

Then deploy the V2.2 source and sign out/sign in again.

**Do not re-run the legacy import for this upgrade.**

## Fresh Supabase setup
For a brand-new installation run:
1. `supabase/schema.sql`
2. `supabase/storage.sql`

`schema.sql` already includes the V2.2 access-control schema.

## Environment
Create:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Server minimum:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_SECRET
SUPABASE_STORAGE_BUCKET=business-documents
CLIENT_URL=http://localhost:5173
APP_ENCRYPTION_KEY=YOUR_RANDOM_SECRET
```

Client minimum:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Never place the Supabase secret/service-role key in the client environment.

## Install and run

```bash
npm run install:all
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000/api`
- Health: `http://localhost:4000/api/health`

## Legacy import (new installations only)
A sanitized legacy export is included under `legacy/`.

```bash
npm run legacy:import
npm run legacy:validate
```

For an existing database that is already migrated, do not run these again just for V2.2.

## Main modules
- Dashboard
- Projects + financial project detail
- Clients
- Subcontractors/Vendors
- Project-vendor assignments
- Client invoices/receipts
- Vendor bills/payments
- Other expenses
- Documents
- Reports + Excel export
- Zoho Books integration
- Audit log
- Users
- Roles & Access

## Search and sorting
V2.2 loads the permitted result set and searches recursively across returned values, including nested project/client/vendor names. Restricted columns are removed server-side first, so a restricted user cannot use search to discover hidden values.

## Duplicate-entry protection
- CRUD Save buttons lock immediately after submission.
- Forms show `Saving...` while requests are active.
- Core create APIs reject an identical repeated submission from the same user within a short safety window.
- React StrictMode has been removed from the development bootstrap to avoid duplicate development effects.

This protects new entries. Existing historical duplicates are not automatically removed.

## Finance safeguards
- Receipts, vendor payments and expenses use deactivate/restore rather than destructive deletion by default.
- Zoho-synced finance records are read-only in Business Deck.
- Projects with finance history cannot be deleted until linked history is resolved.
- Audit logs capture important create/update/delete/deactivate/restore operations.

## Zoho Books
Configure the server environment with:

```env
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REDIRECT_URI=
ZOHO_ORGANIZATION_ID=
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
ZOHO_API_BASE=https://www.zohoapis.com/books/v3
ZOHO_WEBHOOK_SECRET=
```

Project mapping supports Business Deck project codes through the configured Zoho Project Code field and invoice P.O.# mapping from V2.1.1.

## Render deployment
Use two Render services from the same repository:
- `server/` as a Node Web Service
- `client/` as a Static Site

Run `supabase/v2.2_access_control.sql` before deploying V2.2 to an existing production database.
