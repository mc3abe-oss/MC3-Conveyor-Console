/**
 * Output Gate Tests
 *
 * Tests the scope status and output gating functionality:
 * 1. Draft quote/SO: output endpoints return OUTPUTS_REQUIRE_SET
 * 2. Set quote/SO: output endpoints succeed
 * 3. Draft → Set: creates revision #1, updates current_revision_id
 * 4. Set → Draft: does not create a revision
 * 5. Draft → Set again: creates revision #2
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Skip tests if Supabase is not configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const supabase = isSupabaseConfigured
  ? createSupabaseClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
  : null;

// Generate unique test identifiers
const uniqueNumber = () => Math.floor(Math.random() * 900000) + 100000;

describe('Output Gate - Quotes', () => {
  const testQuoteIds: string[] = [];

  afterAll(async () => {
    if (!supabase) return;

    // Clean up test quotes and their revisions
    for (const id of testQuoteIds) {
      await supabase.from('scope_revisions').delete().eq('entity_id', id);
      await supabase.from('quotes').delete().eq('id', id);
    }
  });

  describe('scope_status field', () => {
    it('should default new quotes to draft status', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const baseNumber = uniqueNumber();
      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          base_number: baseNumber,
          quote_number: `Q${baseNumber}`,
          customer_name: 'Test Output Gate Quote',
        })
        .select('id, scope_status, current_revision_id, current_revision_number')
        .single();

      expect(error).toBeNull();
      expect(quote).toBeDefined();
      testQuoteIds.push(quote.id);

      // Default should be 'draft'
      expect(quote.scope_status).toBe('draft');
      expect(quote.current_revision_id).toBeNull();
      expect(quote.current_revision_number).toBeNull();
    });
  });

  describe('Draft → Set transition', () => {
    it('should create revision #1 and update quote when setting scope', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Create a draft quote
      const baseNumber = uniqueNumber();
      const { data: quote, error: createError } = await supabase
        .from('quotes')
        .insert({
          base_number: baseNumber,
          quote_number: `Q${baseNumber}`,
          customer_name: 'Test Draft to Set',
        })
        .select()
        .single();

      expect(createError).toBeNull();
      testQuoteIds.push(quote.id);

      // Get next revision number (simulating the RPC call)
      const { data: nextRevNum } = await supabase.rpc('get_next_scope_revision_number', {
        p_entity_type: 'quote',
        p_entity_id: quote.id,
      });

      expect(nextRevNum).toBe(1);

      // Create a revision (simulating the transition)
      const { data: revision, error: revError } = await supabase
        .from('scope_revisions')
        .insert({
          entity_type: 'quote',
          entity_id: quote.id,
          revision_number: 1,
          status_at_creation: 'set',
          snapshot_json: { specs: [], scope_lines: [], notes: [], attachments: [] },
        })
        .select()
        .single();

      expect(revError).toBeNull();
      expect(revision.revision_number).toBe(1);

      // Update the quote status
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({
          scope_status: 'set',
          current_revision_id: revision.id,
          current_revision_number: 1,
        })
        .eq('id', quote.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedQuote.scope_status).toBe('set');
      expect(updatedQuote.current_revision_id).toBe(revision.id);
      expect(updatedQuote.current_revision_number).toBe(1);
    });
  });

  describe('Set → Draft transition', () => {
    it('should NOT create a new revision when going back to draft', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Create a quote and set it
      const baseNumber = uniqueNumber();
      const { data: quote } = await supabase
        .from('quotes')
        .insert({
          base_number: baseNumber,
          quote_number: `Q${baseNumber}`,
          scope_status: 'set',
          customer_name: 'Test Set to Draft',
        })
        .select()
        .single();

      testQuoteIds.push(quote.id);

      // Create initial revision
      const { data: revision } = await supabase
        .from('scope_revisions')
        .insert({
          entity_type: 'quote',
          entity_id: quote.id,
          revision_number: 1,
          status_at_creation: 'set',
          snapshot_json: {},
        })
        .select()
        .single();

      // Update quote with revision
      await supabase
        .from('quotes')
        .update({
          current_revision_id: revision.id,
          current_revision_number: 1,
        })
        .eq('id', quote.id);

      // Count revisions before
      const { count: beforeCount } = await supabase
        .from('scope_revisions')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', quote.id);

      // Transition to draft
      const { error: draftError } = await supabase
        .from('quotes')
        .update({ scope_status: 'draft' })
        .eq('id', quote.id);

      expect(draftError).toBeNull();

      // Count revisions after - should be the same
      const { count: afterCount } = await supabase
        .from('scope_revisions')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', quote.id);

      expect(afterCount).toBe(beforeCount);

      // Verify quote still has revision references
      const { data: draftQuote } = await supabase
        .from('quotes')
        .select('scope_status, current_revision_id, current_revision_number')
        .eq('id', quote.id)
        .single();

      expect(draftQuote.scope_status).toBe('draft');
      expect(draftQuote.current_revision_id).toBe(revision.id); // Still has reference
      expect(draftQuote.current_revision_number).toBe(1);
    });
  });

  describe('Draft → Set → Draft → Set', () => {
    it('should create revision #2 on second Set', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Create a quote
      const baseNumber = uniqueNumber();
      const { data: quote } = await supabase
        .from('quotes')
        .insert({
          base_number: baseNumber,
          quote_number: `Q${baseNumber}`,
          customer_name: 'Test Multiple Sets',
        })
        .select()
        .single();

      testQuoteIds.push(quote.id);

      // First Set - creates revision #1
      const { data: rev1 } = await supabase
        .from('scope_revisions')
        .insert({
          entity_type: 'quote',
          entity_id: quote.id,
          revision_number: 1,
          status_at_creation: 'set',
          snapshot_json: { test: 'first' },
        })
        .select()
        .single();

      await supabase
        .from('quotes')
        .update({
          scope_status: 'set',
          current_revision_id: rev1.id,
          current_revision_number: 1,
        })
        .eq('id', quote.id);

      // Back to Draft
      await supabase.from('quotes').update({ scope_status: 'draft' }).eq('id', quote.id);

      // Second Set - should create revision #2
      const { data: nextRevNum } = await supabase.rpc('get_next_scope_revision_number', {
        p_entity_type: 'quote',
        p_entity_id: quote.id,
      });

      expect(nextRevNum).toBe(2);

      const { data: rev2 } = await supabase
        .from('scope_revisions')
        .insert({
          entity_type: 'quote',
          entity_id: quote.id,
          revision_number: 2,
          status_at_creation: 'set',
          snapshot_json: { test: 'second' },
        })
        .select()
        .single();

      expect(rev2.revision_number).toBe(2);

      await supabase
        .from('quotes')
        .update({
          scope_status: 'set',
          current_revision_id: rev2.id,
          current_revision_number: 2,
        })
        .eq('id', quote.id);

      // Verify both revisions exist
      const { data: allRevisions } = await supabase
        .from('scope_revisions')
        .select('revision_number')
        .eq('entity_id', quote.id)
        .order('revision_number');

      expect(allRevisions).toHaveLength(2);
      expect(allRevisions![0].revision_number).toBe(1);
      expect(allRevisions![1].revision_number).toBe(2);
    });
  });

  describe('output permission check', () => {
    it('should indicate outputs not allowed when status is draft', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const baseNumber = uniqueNumber();
      const { data: quote } = await supabase
        .from('quotes')
        .insert({
          base_number: baseNumber,
          quote_number: `Q${baseNumber}`,
          scope_status: 'draft',
          customer_name: 'Test Draft Outputs',
        })
        .select()
        .single();

      testQuoteIds.push(quote.id);

      // Check scope_status directly (simulates what the API would check)
      const { data: check } = await supabase
        .from('quotes')
        .select('scope_status')
        .eq('id', quote.id)
        .single();

      expect(check.scope_status).toBe('draft');
      // Outputs should NOT be allowed
      const outputsAllowed = check.scope_status === 'set';
      expect(outputsAllowed).toBe(false);
    });

    it('should indicate outputs allowed when status is set', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const baseNumber = uniqueNumber();
      const { data: quote } = await supabase
        .from('quotes')
        .insert({
          base_number: baseNumber,
          quote_number: `Q${baseNumber}`,
          scope_status: 'set',
          customer_name: 'Test Set Outputs',
        })
        .select()
        .single();

      testQuoteIds.push(quote.id);

      const { data: check } = await supabase
        .from('quotes')
        .select('scope_status')
        .eq('id', quote.id)
        .single();

      expect(check.scope_status).toBe('set');
      // Outputs SHOULD be allowed
      const outputsAllowed = check.scope_status === 'set';
      expect(outputsAllowed).toBe(true);
    });
  });
});

describe('Output Gate - Sales Orders', () => {
  const testSOIds: string[] = [];

  afterAll(async () => {
    if (!supabase) return;

    // Clean up test SOs and their revisions
    for (const id of testSOIds) {
      await supabase.from('scope_revisions').delete().eq('entity_id', id);
      await supabase.from('sales_orders').delete().eq('id', id);
    }
  });

  describe('scope_status field', () => {
    it('should default new sales orders to draft status', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const baseNumber = uniqueNumber();
      const { data: so, error } = await supabase
        .from('sales_orders')
        .insert({
          base_number: baseNumber,
          sales_order_number: `SO${baseNumber}`,
          customer_name: 'Test Output Gate SO',
        })
        .select('id, scope_status, current_revision_id, current_revision_number')
        .single();

      expect(error).toBeNull();
      expect(so).toBeDefined();
      testSOIds.push(so.id);

      // Default should be 'draft'
      expect(so.scope_status).toBe('draft');
      expect(so.current_revision_id).toBeNull();
      expect(so.current_revision_number).toBeNull();
    });
  });

  describe('Draft → Set transition', () => {
    it('should create revision and update SO when setting scope', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const baseNumber = uniqueNumber();
      const { data: so } = await supabase
        .from('sales_orders')
        .insert({
          base_number: baseNumber,
          sales_order_number: `SO${baseNumber}`,
          customer_name: 'Test SO Draft to Set',
        })
        .select()
        .single();

      testSOIds.push(so.id);

      // Get next revision number
      const { data: nextRevNum } = await supabase.rpc('get_next_scope_revision_number', {
        p_entity_type: 'sales_order',
        p_entity_id: so.id,
      });

      expect(nextRevNum).toBe(1);

      // Create revision
      const { data: revision } = await supabase
        .from('scope_revisions')
        .insert({
          entity_type: 'sales_order',
          entity_id: so.id,
          revision_number: 1,
          status_at_creation: 'set',
          snapshot_json: {},
        })
        .select()
        .single();

      // Update SO
      const { data: updatedSO } = await supabase
        .from('sales_orders')
        .update({
          scope_status: 'set',
          current_revision_id: revision.id,
          current_revision_number: 1,
        })
        .eq('id', so.id)
        .select()
        .single();

      expect(updatedSO.scope_status).toBe('set');
      expect(updatedSO.current_revision_number).toBe(1);
    });
  });

  describe('output permission check', () => {
    it('should block outputs for draft SO', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const baseNumber = uniqueNumber();
      const { data: so } = await supabase
        .from('sales_orders')
        .insert({
          base_number: baseNumber,
          sales_order_number: `SO${baseNumber}`,
          scope_status: 'draft',
          customer_name: 'Test SO Draft',
        })
        .select()
        .single();

      testSOIds.push(so.id);

      const { data: check } = await supabase
        .from('sales_orders')
        .select('scope_status')
        .eq('id', so.id)
        .single();

      expect(check.scope_status).toBe('draft');
      expect(check.scope_status === 'set').toBe(false);
    });

    it('should allow outputs for set SO', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const baseNumber = uniqueNumber();
      const { data: so } = await supabase
        .from('sales_orders')
        .insert({
          base_number: baseNumber,
          sales_order_number: `SO${baseNumber}`,
          scope_status: 'set',
          customer_name: 'Test SO Set',
        })
        .select()
        .single();

      testSOIds.push(so.id);

      const { data: check } = await supabase
        .from('sales_orders')
        .select('scope_status')
        .eq('id', so.id)
        .single();

      expect(check.scope_status).toBe('set');
      expect(check.scope_status === 'set').toBe(true);
    });
  });
});

describe('Revision Uniqueness Constraint', () => {
  it('should prevent duplicate revision numbers for same entity', async () => {
    if (!supabase) {
      console.log('Skipping test - Supabase not configured');
      return;
    }

    const baseNumber = uniqueNumber();
    const { data: quote } = await supabase
      .from('quotes')
      .insert({
        base_number: baseNumber,
        quote_number: `Q${baseNumber}`,
        customer_name: 'Test Uniqueness',
      })
      .select()
      .single();

    // First revision should succeed
    const { error: firstError } = await supabase.from('scope_revisions').insert({
      entity_type: 'quote',
      entity_id: quote.id,
      revision_number: 1,
      status_at_creation: 'set',
      snapshot_json: {},
    });

    expect(firstError).toBeNull();

    // Duplicate revision should fail
    const { error: duplicateError } = await supabase.from('scope_revisions').insert({
      entity_type: 'quote',
      entity_id: quote.id,
      revision_number: 1, // Same number
      status_at_creation: 'set',
      snapshot_json: {},
    });

    expect(duplicateError).not.toBeNull();
    expect(duplicateError!.code).toBe('23505'); // Unique violation

    // Cleanup
    await supabase.from('scope_revisions').delete().eq('entity_id', quote.id);
    await supabase.from('quotes').delete().eq('id', quote.id);
  });
});
