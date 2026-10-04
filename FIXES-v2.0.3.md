# Syskode Business Deck V2.0.3

## Fix

V2.0.2 migration scripts correctly supported `SUPABASE_SECRET_KEY`, but the live Express server still initialized its trusted Supabase client from `SUPABASE_SERVICE_ROLE_KEY` only.

When `server/.env` used the recommended `sb_secret_...` key in `SUPABASE_SECRET_KEY`, legacy import and validation worked but protected API routes could return `401 Unauthorized`.

V2.0.3 fixes the server configuration to use:

```js
process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
```

No database re-import is required. Restart the dev server after applying the patch and sign out/sign back in once.
