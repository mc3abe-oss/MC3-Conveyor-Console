/**
 * Supabase Client (Legacy)
 *
 * NOTE: For new code, prefer using:
 * - src/lib/supabase/browser.ts for client components
 * - src/lib/supabase/server.ts for server components and API routes
 *
 * This file is kept for backward compatibility with existing API routes
 * that haven't been migrated yet. The `supabase` export here does NOT
 * have session context - use createClient from server.ts for auth-aware queries.
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
