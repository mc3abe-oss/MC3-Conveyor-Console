/**
 * Supabase Client
 *
 * Provides server-side Supabase client for API routes
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

/**
 * Get current user ID from request
 * For now, returns a mock user ID - replace with actual auth later
 */
export function getCurrentUserId(): string {
  // TODO: Implement actual authentication
  // For now, return a mock user ID for development
  return '00000000-0000-0000-0000-000000000001';
}
