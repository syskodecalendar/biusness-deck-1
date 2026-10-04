# Syskode Business Deck v2.0.2

## Migration/RLS fix

- Migration scripts no longer import `dotenv`; Node 24 loads `server/.env` through `--env-file`.
- Supports Supabase `SUPABASE_SECRET_KEY` (`sb_secret_...`) as the recommended backend key.
- Still supports legacy `SUPABASE_SERVICE_ROLE_KEY`.
- Rejects publishable/anon keys before any write.
- Performs a Supabase Auth Admin preflight to confirm the key has server/admin privileges before importing.
- Keeps the import idempotent; rerunning is safe because legacy IDs are upsert keys.

Do not disable RLS. Use the correct backend secret/service-role key instead.
