/**
 * Supabase Admin Client (Server-Only)
 *
 * SECURITY: This module uses the service role key and MUST NEVER be imported
 * into client-side code. The 'server-only' import enforces this at build time.
 *
 * NOTE: For new code, prefer using:
 * - src/lib/supabase/browser.ts for client components
 * - src/lib/supabase/server.ts for server components and API routes
 *
 * The supabaseAdmin client bypasses RLS - use only in API routes for admin operations.
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create client with fallback values for development
// Will return errors at runtime if credentials are invalid
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * Admin client using service role key - bypasses RLS
 * Only use in server-side API routes for admin operations
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key');
}

/**
 * Check if admin client is available (service role key configured)
 */
export function isAdminConfigured(): boolean {
  return !!supabaseAdmin;
}
