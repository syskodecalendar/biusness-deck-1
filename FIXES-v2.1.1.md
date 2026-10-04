# Syskode Business Deck V2.1.1 — Zoho Invoice/Payment Mapping Fix

## Fixed
- Zoho invoices can now map to Business Deck using the invoice **P.O.#** field (for example `SK-LEGACY-0960`), in addition to the `Project Code` custom field.
- If the invoice list response does not contain enough mapping data, Business Deck retrieves the full Zoho invoice before marking it unmapped.
- Customer payments now inherit their Business Deck project from the linked Zoho invoice.
- If necessary, Business Deck retrieves full customer-payment details and follows the `invoices[]` relationship.
- Synced customer receipts now link to `client_invoices.invoice_id` when available.
- Zoho reconciliation messages are clearer about why a record could not be mapped.

## No database migration required
This patch only changes server sync logic and the Zoho help text. Existing Supabase data remains intact.
