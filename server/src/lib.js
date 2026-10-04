import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

if (!config.supabaseUrl || !config.serviceKey) {
  throw new Error('Supabase server environment is missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY in server/.env.')
}

export const admin = createClient(config.supabaseUrl, config.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})
