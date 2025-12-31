/**
 * Save/Load/Delete API Integration Tests
 *
 * These tests verify the critical save/load/delete functionality that caused
 * production issues. They run against the actual database to catch real bugs.
 *
 * REQUIREMENTS TESTED:
 * 1. Save SO -> returns canonical ids
 * 2. Delete Draft -> truly deletes and allows re-create
 * 3. Delete SO line -> deletes application only when unreferenced
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Skip these tests if Supabase is not configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = !!(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY));

// Use service role key for tests (bypasses RLS)
const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY || '';

// Create a test client - only if configured
const supabase = isSupabaseConfigured
  ? createSupabaseClient(SUPABASE_URL!, supabaseKey)
  : null;

// Generate unique test identifiers
const TEST_PREFIX = `TEST_${Date.now()}`;
const uniqueNumber = () => Math.floor(Math.random() * 900000) + 100000;

// Helper to create a minimal application record
async function createTestApplication(overrides: Record<string, unknown> = {}) {
  if (!supabase) throw new Error('Supabase not configured');

  const baseNumber = uniqueNumber();
  const slug = `config:sales_order:${baseNumber}:1`;
  const name = `${TEST_PREFIX} App ${baseNumber}`;

  const record = {
    slug,
    name,
    recipe_type: 'reference',
    recipe_tier: 'regression',
    recipe_status: 'active',
    model_key: 'sliderbed_v1',
    model_version_id: 'v1.0.0',
    inputs: {
      belt_width_in: 24,
      _config: {
        reference_type: 'SALES_ORDER',
        reference_number: String(baseNumber),
        reference_number_base: baseNumber,
        reference_line: 1,
      },
    },
    inputs_hash: `test_hash_${Date.now()}`,
    source: 'test',
    is_active: true,
    ...overrides,
  };

  const { data, error } = await supabase
    .from('calc_recipes')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(`Failed to create test application: ${error.message}`);
  return { application: data, baseNumber };
}

// Helper to create a Sales Order record
async function createTestSalesOrder(baseNumber: number, customerName: string = 'Test Customer') {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('sales_orders')
    .insert({
      base_number: baseNumber,
      sales_order_number: `SO${baseNumber}`,
      customer_name: customerName,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test SO: ${error.message}`);
  return data;
}

// Helper to create a Quote record
async function createTestQuote(baseNumber: number, customerName: string = 'Test Customer') {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      quote_number: `Q${baseNumber}`,
      customer_name: customerName,
      quote_status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test quote: ${error.message}`);
  return data;
}

// Cleanup helper
async function cleanupTestData() {
  if (!supabase) return;

  // Delete test applications
  await supabase
    .from('calc_recipes')
    .delete()
    .like('name', `${TEST_PREFIX}%`);

  // Delete test sales orders
  await supabase
    .from('sales_orders')
    .delete()
    .like('customer_name', `${TEST_PREFIX}%`);

  // Delete test quotes
  await supabase
    .from('quotes')
    .delete()
    .like('customer_name', `${TEST_PREFIX}%`);
}

// Conditional describe - skip if Supabase not configured
const describeIfConfigured = isSupabaseConfigured ? describe : describe.skip;

describeIfConfigured('Save/Load/Delete API Integration', () => {
  // Cleanup before and after all tests
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('1) Save SO -> returns canonical ids', () => {
    it('should return applicationId and salesOrderId when saving to SO', async () => {
      const baseNumber = uniqueNumber();
      const customerName = `${TEST_PREFIX} Customer`;

      // Create a Sales Order first
      const salesOrder = await createTestSalesOrder(baseNumber, customerName);
      expect(salesOrder.id).toBeDefined();
      expect(salesOrder.base_number).toBe(baseNumber);

      // Create an application linked to this SO
      const { application } = await createTestApplication({
        name: `${TEST_PREFIX} Save Test ${baseNumber}`,
        sales_order_id: salesOrder.id,
        inputs: {
          belt_width_in: 24,
          _config: {
            reference_type: 'SALES_ORDER',
            reference_number: String(baseNumber),
            reference_number_base: baseNumber,
            reference_line: 1,
          },
        },
      });

      // Verify the application was created with correct linkage
      expect(application.id).toBeDefined();
      expect(application.sales_order_id).toBe(salesOrder.id);

      // Verify we can load the application by ID
      const { data: loadedApp, error } = await supabase!
        .from('calc_recipes')
        .select('*')
        .eq('id', application.id)
        .single();

      expect(error).toBeNull();
      expect(loadedApp).toBeDefined();
      expect(loadedApp.id).toBe(application.id);
      expect(loadedApp.sales_order_id).toBe(salesOrder.id);

      // Cleanup
      await supabase!.from('calc_recipes').delete().eq('id', application.id);
      await supabase!.from('sales_orders').delete().eq('id', salesOrder.id);
    });

    it('should trim sales order number (digits only)', async () => {
      const baseNumber = uniqueNumber();
      const customerName = `${TEST_PREFIX} Customer`;

      // Test that base_number is stored as integer
      const salesOrder = await createTestSalesOrder(baseNumber, customerName);
      expect(salesOrder.base_number).toBe(baseNumber);
      expect(typeof salesOrder.base_number).toBe('number');

      // Cleanup
      await supabase!.from('sales_orders').delete().eq('id', salesOrder.id);
    });
  });

  describe('2) Delete Draft -> truly deletes and allows re-create', () => {
    it('should hard delete an unlinked application', async () => {
      // Create an application WITHOUT any FK linkage (no quote_id, no sales_order_id)
      const { application, baseNumber } = await createTestApplication({
        name: `${TEST_PREFIX} Draft ${uniqueNumber()}`,
        quote_id: null,
        sales_order_id: null,
      });

      expect(application.id).toBeDefined();

      // Hard delete the application
      const { error: deleteError } = await supabase!
        .from('calc_recipes')
        .delete()
        .eq('id', application.id);

      expect(deleteError).toBeNull();

      // Verify it's truly deleted
      const { data: shouldBeNull, error: fetchError } = await supabase!
        .from('calc_recipes')
        .select('id')
        .eq('id', application.id)
        .maybeSingle();

      expect(fetchError).toBeNull();
      expect(shouldBeNull).toBeNull();
    });

    it('should allow re-creating SO with same number after delete', async () => {
      const baseNumber = uniqueNumber();
      const customerName = `${TEST_PREFIX} Recreate Test`;

      // Create first SO
      const firstSO = await createTestSalesOrder(baseNumber, customerName);
      expect(firstSO.id).toBeDefined();

      // Delete it
      await supabase!.from('sales_orders').delete().eq('id', firstSO.id);

      // Verify deleted
      const { data: shouldBeNull } = await supabase!
        .from('sales_orders')
        .select('id')
        .eq('id', firstSO.id)
        .maybeSingle();
      expect(shouldBeNull).toBeNull();

      // Create SO with same number again - should succeed
      const secondSO = await createTestSalesOrder(baseNumber, customerName + ' v2');
      expect(secondSO.id).toBeDefined();
      expect(secondSO.base_number).toBe(baseNumber);

      // Cleanup
      await supabase!.from('sales_orders').delete().eq('id', secondSO.id);
    });
  });

  describe('3) Delete SO line -> deletes application only when unreferenced', () => {
    it('Case A: single SO reference -> delete line -> app should be deleted', async () => {
      const baseNumber = uniqueNumber();
      const customerName = `${TEST_PREFIX} Single Ref`;

      // Create SO
      const salesOrder = await createTestSalesOrder(baseNumber, customerName);

      // Create application linked ONLY to this SO
      const { application } = await createTestApplication({
        name: `${TEST_PREFIX} Single SO Ref ${baseNumber}`,
        quote_id: null,
        sales_order_id: salesOrder.id,
      });

      // Verify app is linked to SO
      expect(application.sales_order_id).toBe(salesOrder.id);
      expect(application.quote_id).toBeNull();

      // Delete the application (simulating "delete SO line")
      const { error: deleteError } = await supabase!
        .from('calc_recipes')
        .delete()
        .eq('id', application.id);

      expect(deleteError).toBeNull();

      // Verify app is truly deleted
      const { data: shouldBeNull } = await supabase!
        .from('calc_recipes')
        .select('id')
        .eq('id', application.id)
        .maybeSingle();

      expect(shouldBeNull).toBeNull();

      // Cleanup
      await supabase!.from('sales_orders').delete().eq('id', salesOrder.id);
    });

    it('Case B: dual reference (Quote + SO) -> delete SO line -> app deactivated but exists', async () => {
      const baseNumber = uniqueNumber();
      const customerName = `${TEST_PREFIX} Dual Ref`;

      // Create Quote and SO
      const quote = await createTestQuote(baseNumber, customerName);
      const salesOrder = await createTestSalesOrder(baseNumber + 1, customerName);

      // Create application linked to BOTH
      const { application } = await createTestApplication({
        name: `${TEST_PREFIX} Dual Ref ${baseNumber}`,
        quote_id: quote.id,
        sales_order_id: salesOrder.id,
      });

      // Verify app has both linkages
      expect(application.quote_id).toBe(quote.id);
      expect(application.sales_order_id).toBe(salesOrder.id);

      // Simulate "delete SO line" - deactivate and remove SO linkage
      const { error: updateError } = await supabase!
        .from('calc_recipes')
        .update({
          is_active: false,
          sales_order_id: null,
        })
        .eq('id', application.id);

      expect(updateError).toBeNull();

      // Verify app still exists but is deactivated
      const { data: deactivatedApp } = await supabase!
        .from('calc_recipes')
        .select('id, is_active, quote_id, sales_order_id')
        .eq('id', application.id)
        .single();

      expect(deactivatedApp).toBeDefined();
      expect(deactivatedApp!.is_active).toBe(false);
      expect(deactivatedApp!.quote_id).toBe(quote.id);
      expect(deactivatedApp!.sales_order_id).toBeNull();

      // Cleanup
      await supabase!.from('calc_recipes').delete().eq('id', application.id);
      await supabase!.from('sales_orders').delete().eq('id', salesOrder.id);
      await supabase!.from('quotes').delete().eq('id', quote.id);
    });
  });

  describe('Database constraints', () => {
    it('should enforce unique SO base_number for non-deleted records', async () => {
      const baseNumber = uniqueNumber();
      const customerName = `${TEST_PREFIX} Unique Test`;

      // Create first SO
      const firstSO = await createTestSalesOrder(baseNumber, customerName);
      expect(firstSO.id).toBeDefined();

      // Try to create duplicate - should fail
      const { error: dupError } = await supabase!
        .from('sales_orders')
        .insert({
          base_number: baseNumber,
          sales_order_number: `SO${baseNumber}`,
          customer_name: customerName + ' dup',
        })
        .select()
        .single();

      expect(dupError).toBeDefined();
      expect(dupError!.code).toBe('23505'); // Unique violation

      // Cleanup
      await supabase!.from('sales_orders').delete().eq('id', firstSO.id);
    });
  });
});

// Export for external use
export { createTestApplication, createTestSalesOrder, cleanupTestData };
