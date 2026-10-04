# Syskode Business Deck v2.0.1 fixes

This patch addresses the local-development errors reported after the legacy import.

## Fixed

- API `401 Unauthorized` caused by server-side access-token validation depending on a separate Supabase anon key.
- Protected API authentication now validates the browser access token with the server-side Supabase service-role client.
- Axios now retries one `401` request after refreshing the Supabase session.
- Supabase AuthProvider updates local session state immediately after sign-in/sign-out.
- React `useEffect` callbacks in Clients, Vendors and Zoho no longer return Promises.
- Root legacy import/validation scripts automatically load `server/.env`.
- Server dev/start commands explicitly load `server/.env` when run through npm prefix.
- Client accepts either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.

## After replacing the source

1. Keep your existing `server/.env` and `client/.env` files. They are not included in the ZIP.
2. Confirm both environment files point to the same Supabase project URL.
3. Restart both servers with `npm run dev`.
4. Sign out and sign back in once so the browser has a fresh access token.
