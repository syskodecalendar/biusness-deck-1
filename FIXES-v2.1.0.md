# V2.1.0 - CRUD + Light Theme

## UI
- Replaced the dark visual system with a light Syskode blue/white design.
- Added action controls, confirmation dialogs, editable forms and detail views.
- Added Users & Roles navigation for Super Admin.

## CRUD
- Clients: C/R/U/D
- Vendors: C/R/U/D
- Projects: C/R/U/D with finance-history deletion guard
- Project Vendors: C/R/U/D
- Client Invoices: C/R/U/D for manual records
- Client Receipts: C/R/U + deactivate/restore
- Vendor Bills: C/R/U/D for manual records
- Vendor Payments: C/R/U + deactivate/restore
- Expenses: C/R/U + deactivate/restore
- Documents: upload/read/update metadata/delete
- Users: create/read/update/deactivate + roles/status

## Safety
- Zoho-synced financial records are read-only in Business Deck.
- Viewer is read-only.
- Project Manager cannot mutate finance records.
- Finance cannot mutate project delivery records.
- User deactivation keeps the account/profile for audit history.
