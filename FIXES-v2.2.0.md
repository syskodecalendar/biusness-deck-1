# Syskode Business Deck V2.2.0

## Configurable roles and access
- Added **Roles & Access** administration for Super Admin.
- Roles can control page/module access and CRUD actions.
- Roles can control visible fields/table columns per module.
- Hidden configured columns are filtered from Node API responses, not only hidden with CSS.
- Added built-in **Vendor Portal** and **Client Portal** roles.

## Per-user data scope
Each user can be limited to:
- All permitted records
- One linked vendor
- One linked client
- Selected projects
- Projects managed by that user

Vendor-scoped users only receive projects, assignments, vendor bills, vendor payments and documents belonging to their linked vendor. Vendor financial totals are recalculated for that vendor only, so a vendor cannot see another subcontractor's committed/paid/payable values on a shared project.

## Search and sorting
- Search now scans every returned/visible field on each major page, including nested client/vendor/project values.
- Added sorting to Dashboard, Projects, Clients, Vendors, Transactions, Reports, Audit, Zoho logs, Users, Roles and project-detail finance sections.
- Full-list pages use paginated API retrieval before local page search/sort.

## Duplicate entry protection
- Added single-flight Save guards and disabled `Saving...` controls to CRUD forms.
- Removed React StrictMode double-effect behavior from the application bootstrap.
- Added a short server-side duplicate-create guard for core CRUD endpoints.

## Page/security consistency fixes
- Sidebar and direct routes follow the same permission engine.
- Project detail sub-sections follow the same permissions as their main modules.
- Reports/Excel exports respect data scope and visible financial columns.
- Audit and Zoho reconciliation pages respect role access and column rules.
- Document download/edit/delete is scope checked on the API.
- Zoho-synced finance records remain read-only in Business Deck.
- Upgraded Multer to 2.x.

## Database change
V2.2 requires `supabase/v2.2_access_control.sql` once on an existing V2.1.x database. No legacy re-import is required.
