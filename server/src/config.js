import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL,
  // Kept for backwards compatibility; protected API validation now uses the
  // service-role client on the server.
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
  // Prefer Supabase's current sb_secret_ key; fall back to the legacy service_role key.
  serviceKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  bucket: process.env.SUPABASE_STORAGE_BUCKET || 'business-documents',
  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    redirectUri: process.env.ZOHO_REDIRECT_URI,
    orgId: process.env.ZOHO_ORGANIZATION_ID,
    accountsUrl: process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com',
    apiBase: process.env.ZOHO_API_BASE || 'https://www.zohoapis.com/books/v3',
    webhookSecret: process.env.ZOHO_WEBHOOK_SECRET
  }
}
