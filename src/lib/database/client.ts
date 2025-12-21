/**
 * SUPABASE DATABASE CLIENT
 *
 * Provides configured Supabase client for database operations
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for admin operations)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance (singleton)
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseKey) {
    throw new Error(
      'SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // For server-side use
    },
  });

  return supabaseClient;
}

/**
 * Create a new Supabase client with custom options
 * Useful for testing or specific use cases
 */
export function createSupabaseClient(
  url: string,
  key: string,
  options?: Parameters<typeof createClient>[2]
): SupabaseClient {
  return createClient(url, key, options);
}

/**
 * Reset the singleton client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
}
