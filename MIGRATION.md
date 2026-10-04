# Legacy Migration Notes

The supplied legacy database is a phpMyAdmin dump from MariaDB. It contains company/client master data, project master data, subcontractors, vendor/project subwork costs, and one mixed transaction ledger used for both income and expenses.

## Important legacy behaviors preserved
- Original IDs are stored as `legacy_id`.
- Active/deactivated values are retained in `legacy_status` where relevant.
- Historical tax values are preserved.
- Historical remarks and account-head labels are preserved as references/descriptions.
- Legacy users are not migrated because authentication is being replaced by Supabase Auth.

## Classification of old transactions
1. `Income Account` -> client receipt.
2. Expense with a subcontractor ID or an account head containing `Vendor Payment` -> vendor payment.
3. Other expense records -> project expense.

This classification is deterministic and reviewable. Use the reports after import to identify old records that need manual recategorization.

## Validation after import
Compare the following between legacy and V2 before cutover:
- project count
- client count
- subcontractor count
- total contract value
- total income received
- total expense
- vendor committed cost
- vendor payments
- key project balances

The old SQL is retained under `legacy/` for audit/reference during migration.

## Automated validation
After importing, run:

```bash
npm run legacy:validate
```

The command compares V2 counts/totals against `legacy/validation-baseline.json` and highlights mismatches.

## V2.2 access-control upgrade (existing V2.1.x installations)
Do not re-import legacy records. Run `supabase/v2.2_access_control.sql` once in Supabase SQL Editor, deploy the V2.2 source, then sign out and sign back in. Existing users are mapped to matching access roles automatically.

Vendor/client/project data scopes apply only after the V2.2 SQL migration has been run.
