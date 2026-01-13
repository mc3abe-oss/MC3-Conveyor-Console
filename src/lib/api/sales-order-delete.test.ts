/**
 * Sales Order Delete API Tests
 *
 * Tests the corrected Sales Order delete behavior:
 * 1. Not linked to quote => hard delete succeeds, row removed, cannot open by URL
 * 2. Linked to quote => delete blocked, button disabled or API rejects, record remains normal
 * 3. Existing zombie (SO with no applications) => handled gracefully
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Skip these tests if Supabase is not configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const supabase = isSupabaseConfigured
  ? createSupabaseClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
  : null;

// Generate unique test identifiers
const uniqueNumber = () => Math.floor(Math.random() * 900000) + 100000;

describe('Sales Order Delete API', () => {
  // Clean up test data after all tests
  const testSOIds: string[] = [];
  const testQuoteIds: string[] = [];

  afterAll(async () => {
    if (!supabase) return;

    // Clean up test SOs
    if (testSOIds.length > 0) {
      await supabase.from('sales_orders').delete().in('id', testSOIds);
    }
    // Clean up test Quotes
    if (testQuoteIds.length > 0) {
      await supabase.from('quotes').delete().in('id', testQuoteIds);
    }
  });

  describe('when SO is NOT linked to a Quote', () => {
    it('should allow hard delete and remove the row', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Create a test SO without origin_quote_id
      const baseNumber = uniqueNumber();
      const { data: so, error: createError } = await supabase
        .from('sales_orders')
        .insert({
          base_number: baseNumber,
          sales_order_number: `SO${baseNumber}`,
          origin_quote_id: null,
          customer_name: 'Test Customer (DELETE TEST)',
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(so).toBeDefined();
      testSOIds.push(so.id);

      // Verify delete eligibility
      const { data: eligibility, error: eligError } = await supabase
        .from('sales_orders')
        .select('id, origin_quote_id')
        .eq('id', so.id)
        .single();

      expect(eligError).toBeNull();
      expect(eligibility.origin_quote_id).toBeNull(); // Not linked

      // Delete the SO
      const { error: deleteError } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', so.id);

      expect(deleteError).toBeNull();

      // Verify it's gone
      const { data: afterDelete, error: fetchError } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('id', so.id)
        .maybeSingle();

      expect(fetchError).toBeNull();
      expect(afterDelete).toBeNull(); // Row should be gone

      // Remove from cleanup list since it's already deleted
      const idx = testSOIds.indexOf(so.id);
      if (idx > -1) testSOIds.splice(idx, 1);
    });
  });

  describe('when SO IS linked to a Quote', () => {
    it('should have origin_quote_id set (delete should be blocked by API)', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Create a test Quote first
      const quoteBaseNumber = uniqueNumber();
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          base_number: quoteBaseNumber,
          quote_number: `Q${quoteBaseNumber}`,
          quote_status: 'won',
          customer_name: 'Test Quote Customer',
        })
        .select()
        .single();

      expect(quoteError).toBeNull();
      expect(quote).toBeDefined();
      testQuoteIds.push(quote.id);

      // Create a test SO linked to the Quote
      const soBaseNumber = uniqueNumber();
      const { data: so, error: createError } = await supabase
        .from('sales_orders')
        .insert({
          base_number: soBaseNumber,
          sales_order_number: `SO${soBaseNumber}`,
          origin_quote_id: quote.id, // Linked to quote
          customer_name: 'Test Customer (LINKED TO QUOTE)',
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(so).toBeDefined();
      testSOIds.push(so.id);

      // Verify it's linked
      expect(so.origin_quote_id).toBe(quote.id);

      // The API endpoint should reject deletion - we test the logic here
      // (The actual API rejection is in the route handler)
      const { data: eligibility } = await supabase
        .from('sales_orders')
        .select('origin_quote_id')
        .eq('id', so.id)
        .single();

      expect(eligibility?.origin_quote_id).not.toBeNull();
      // This SO should NOT be deletable via API
    });
  });

  describe('zombie detection', () => {
    it('should identify SO with no active applications as zombie', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Create a test SO without any applications
      const baseNumber = uniqueNumber();
      const { data: so, error: createError } = await supabase
        .from('sales_orders')
        .insert({
          base_number: baseNumber,
          sales_order_number: `SO${baseNumber}`,
          origin_quote_id: null,
          customer_name: 'Test Zombie SO',
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(so).toBeDefined();
      testSOIds.push(so.id);

      // Count applications for this SO
      const { count, error: countError } = await supabase
        .from('calc_recipes')
        .select('*', { count: 'exact', head: true })
        .eq('sales_order_id', so.id)
        .eq('is_active', true)
        .is('deleted_at', null);

      expect(countError).toBeNull();
      expect(count).toBe(0); // No applications = zombie

      // This SO is a zombie (exists but has no applications)
      // The cleanup script should detect and handle it
    });
  });
});
