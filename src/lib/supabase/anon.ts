/**
 * Supabase Anon Client
 *
 * This client uses the public anon key and can be safely imported into code
 * that may be bundled for client-side use. It respects RLS policies.
 *
 * NOTE: For server components and API routes, prefer using:
 * - src/lib/supabase/server.ts (cookie-based auth)
 * - src/lib/supabase/client.ts (admin operations with service role)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client with fallback values for development
// Will return errors at runtime if credentials are invalid
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key');
}
