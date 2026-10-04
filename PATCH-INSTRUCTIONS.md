# Upgrade V2.1.1 -> V2.2.0

V2.2 adds configurable role permissions, table-column visibility, vendor/client/project data scopes, comprehensive search/sorting and duplicate-save protection.

## 1. Back up
Keep a copy of your current source and Render environment variables. The patch does not contain `.env` files.

## 2. Run the new Supabase migration FIRST
In **Supabase -> SQL Editor**, run the complete file:

`supabase/v2.2_access_control.sql`

Run it once against the same Supabase project used by Business Deck.

It creates `access_roles` and adds these profile fields:
- `access_role_id`
- `data_scope`
- `linked_vendor_id`
- `linked_client_id`
- `allowed_project_ids`

Existing users are mapped to the matching V2.2 role automatically.

## 3. Apply the patch / deploy
Copy the patch files over your V2.1.1 source, then install/update dependencies:

```bash
npm install
npm run install:all
```

For Render, commit and push the changed files and let the backend/frontend redeploy.

## 4. Sign out and sign back in
This refreshes the access profile returned to the React app.

## 5. Configure access
Sign in as Super Admin and open **Roles & Access**.

For each role choose:
- Which modules/pages can be viewed
- Create/Edit/Delete/Export/Sync actions where applicable
- Which table/financial fields are visible

Then open **Users** and assign each user:
- an Access Role
- a Data Scope

### Vendor sharing example
1. Create/select the **Vendor Portal** role.
2. Select only the columns you want that vendor to see.
3. Edit/create the vendor login under **Users**.
4. Set **Access Role = Vendor Portal**.
5. Set **Data Scope = One linked vendor**.
6. Select that subcontractor/vendor.

That user can only receive records linked to that vendor. The Node API enforces this scope.

### Selected-project sharing example
Set **Data Scope = Selected projects only**, then choose the allowed projects.

## Important
- Do **not** run `npm run legacy:import` again for this upgrade.
- Existing duplicate records are not automatically deleted. V2.2 prevents new accidental duplicate submissions; review any old duplicates manually before deleting/deactivating them.
- User and role administration itself remains Super Admin only.


# Upgrade V2.2.1 -> V2.2.2

This patch fixes restricted-role Project Name/Project Code output and hardens Vendor Portal isolation.

1. Copy the V2.2.2 patch files over the existing V2.2.1 source.
2. No new Supabase SQL is required if `v2.2_access_control.sql` was already installed.
3. Restart/redeploy the frontend and backend.
4. Sign out and sign back in as the vendor user.
5. Under **Users**, set each vendor account to **Vendor Portal** and select its **Linked Vendor**.
6. Under **Roles & Access -> Vendor Portal**, confirm `Project Name` (and any other permitted fields) are checked.

Vendor-scoped users can now receive only records belonging to their linked vendor and projects with a current non-cancelled assignment.
