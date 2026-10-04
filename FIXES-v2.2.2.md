# V2.2.2 - Vendor Portal Isolation & Project Name Fix

## Fixed
- Project Code and Project Name are no longer stripped from restricted Project / Project Financial rows.
- Vendor Portal users now see the project identity fields that are enabled in Roles & Access.
- Vendor-scoped users are restricted to projects with a current, non-cancelled assignment for their linked vendor.
- Vendor assignment lists exclude cancelled assignments for vendor-scoped users.
- Vendor bills and vendor payments require both the linked vendor and an allowed/currently assigned project.
- Vendor-linked documents require both the linked vendor and an allowed/currently assigned project.
- Record-level access checks use the same vendor + project isolation as list endpoints.
- Create operations for vendor financial/assignment records cannot target another vendor when a vendor-scoped account has create permission.
- Vendor Portal user accounts are server-enforced to use the `vendor` data scope and must have a linked vendor.
- Client Portal receives the equivalent safety rule for its linked client scope.
- Users UI automatically selects and locks the matching data scope when Vendor Portal or Client Portal is chosen.

## Vendor login setup
For each vendor account:
1. Access Role: `Vendor Portal`
2. Data Scope: `One linked vendor`
3. Linked Vendor: select the matching vendor record
4. In Roles & Access, enable only the fields/columns that vendor is allowed to see.

The API then limits the account to that vendor's current project assignments and permitted data.

## Database migration
No new SQL migration is required for V2.2.2 when V2.2 access control is already installed.
