/**
 * POST /api/quotes/[id]/convert
 *
 * Convert a Quote to a Sales Order.
 *
 * CONVERSION RULES:
 * 1. Block if quote_status = 'converted' OR converted_to_sales_order_id is set
 * 2. Block if quote_status != 'won' (only won quotes can be converted)
 * 3. In a single operation:
 *    a. Create sales_orders row
 *    b. Copy attachments (new rows, same file_path)
 *    c. Copy notes (new rows)
 *    d. Copy ONLY is_current=true specs
 *    e. Copy scope_lines
 *    f. Update quote: status='converted', is_read_only=true, link to SO
 * 4. Return new sales order
 *
 * This is a ONE-TIME, IRREVERSIBLE operation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../../src/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: quoteId } = await params;
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // 1. Fetch the quote and validate state
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Block if already converted
    if (quote.quote_status === 'converted') {
      return NextResponse.json(
        { error: 'Quote has already been converted', sales_order_id: quote.converted_to_sales_order_id },
        { status: 409 }
      );
    }

    if (quote.converted_to_sales_order_id) {
      return NextResponse.json(
        { error: 'Quote has already been converted', sales_order_id: quote.converted_to_sales_order_id },
        { status: 409 }
      );
    }

    // Block if not 'won'
    if (quote.quote_status !== 'won') {
      return NextResponse.json(
        { error: `Cannot convert quote with status '${quote.quote_status}'. Only 'won' quotes can be converted.` },
        { status: 400 }
      );
    }

    // 2. Generate sales order base number
    const { data: baseNumber, error: genError } = await supabase.rpc('next_sales_order_base_number');

    if (genError) {
      console.error('SO base number generation error:', genError);
      return NextResponse.json(
        { error: 'Failed to generate sales order base number', details: genError.message },
        { status: 500 }
      );
    }

    // 3. Create the Sales Order
    const { data: salesOrder, error: soError } = await supabase
      .from('sales_orders')
      .insert({
        base_number: baseNumber,
        sales_order_number: `SO${baseNumber}`, // Legacy format
        origin_quote_id: quoteId,
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        created_by: userId,
      })
      .select()
      .single();

    if (soError) {
      console.error('Sales order creation error:', soError);
      return NextResponse.json(
        { error: 'Failed to create sales order', details: soError.message },
        { status: 500 }
      );
    }

    const salesOrderId = salesOrder.id;

    // 4. Copy attachments (new rows pointing to same file_path)
    const { data: attachments } = await supabase
      .from('attachments')
      .select('*')
      .eq('parent_type', 'quote')
      .eq('parent_id', quoteId)
      .is('deleted_at', null);

    if (attachments && attachments.length > 0) {
      const attachmentCopies = attachments.map((a) => ({
        parent_type: 'sales_order' as const,
        parent_id: salesOrderId,
        file_path: a.file_path, // Same file reference
        file_name: a.file_name,
        file_size: a.file_size,
        mime_type: a.mime_type,
        tag: a.tag,
        created_by: a.created_by || userId, // Preserve original or use converter
        created_at: a.created_at, // Preserve original timestamp
      }));

      const { error: attachError } = await supabase
        .from('attachments')
        .insert(attachmentCopies);

      if (attachError) {
        console.error('Attachment copy error:', attachError);
        // Rollback: delete the sales order
        await supabase.from('sales_orders').delete().eq('id', salesOrderId);
        return NextResponse.json(
          { error: 'Failed to copy attachments', details: attachError.message },
          { status: 500 }
        );
      }
    }

    // 5. Copy notes
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('parent_type', 'quote')
      .eq('parent_id', quoteId);

    if (notes && notes.length > 0) {
      const noteCopies = notes.map((n) => ({
        parent_type: 'sales_order' as const,
        parent_id: salesOrderId,
        content: n.content,
        created_by: n.created_by || userId,
        created_at: n.created_at, // Preserve original timestamp
      }));

      const { error: noteError } = await supabase
        .from('notes')
        .insert(noteCopies);

      if (noteError) {
        console.error('Note copy error:', noteError);
        // Rollback
        await supabase.from('attachments').delete().eq('parent_id', salesOrderId);
        await supabase.from('sales_orders').delete().eq('id', salesOrderId);
        return NextResponse.json(
          { error: 'Failed to copy notes', details: noteError.message },
          { status: 500 }
        );
      }
    }

    // 6. Copy ONLY current specs (is_current = true)
    const { data: specs } = await supabase
      .from('specs')
      .select('*')
      .eq('parent_type', 'quote')
      .eq('parent_id', quoteId)
      .eq('is_current', true);

    if (specs && specs.length > 0) {
      const specCopies = specs.map((s) => ({
        parent_type: 'sales_order' as const,
        parent_id: salesOrderId,
        key: s.key,
        value: s.value,
        units: s.units,
        confidence: s.confidence,
        source_type: s.source_type,
        source_id: s.source_id, // Note: this references quote's note/attachment, may need mapping
        is_current: true, // Start as current in SO
        created_by: s.created_by || userId,
        created_at: s.created_at, // Preserve original timestamp
      }));

      const { error: specError } = await supabase
        .from('specs')
        .insert(specCopies);

      if (specError) {
        console.error('Spec copy error:', specError);
        // Rollback
        await supabase.from('notes').delete().eq('parent_id', salesOrderId);
        await supabase.from('attachments').delete().eq('parent_id', salesOrderId);
        await supabase.from('sales_orders').delete().eq('id', salesOrderId);
        return NextResponse.json(
          { error: 'Failed to copy specs', details: specError.message },
          { status: 500 }
        );
      }
    }

    // 7. Copy scope lines
    const { data: scopeLines } = await supabase
      .from('scope_lines')
      .select('*')
      .eq('parent_type', 'quote')
      .eq('parent_id', quoteId)
      .is('deleted_at', null);

    if (scopeLines && scopeLines.length > 0) {
      const scopeCopies = scopeLines.map((sl) => ({
        parent_type: 'sales_order' as const,
        parent_id: salesOrderId,
        category: sl.category,
        text: sl.text,
        inclusion: sl.inclusion,
        position: sl.position,
        version: sl.version, // Preserve version
        created_by: sl.created_by || userId,
        created_at: sl.created_at,
      }));

      const { error: scopeError } = await supabase
        .from('scope_lines')
        .insert(scopeCopies);

      if (scopeError) {
        console.error('Scope line copy error:', scopeError);
        // Rollback
        await supabase.from('specs').delete().eq('parent_id', salesOrderId);
        await supabase.from('notes').delete().eq('parent_id', salesOrderId);
        await supabase.from('attachments').delete().eq('parent_id', salesOrderId);
        await supabase.from('sales_orders').delete().eq('id', salesOrderId);
        return NextResponse.json(
          { error: 'Failed to copy scope lines', details: scopeError.message },
          { status: 500 }
        );
      }
    }

    // 8. Update the quote: status = 'converted', is_read_only = true, link to SO
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        quote_status: 'converted',
        is_read_only: true,
        converted_to_sales_order_id: salesOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (updateError) {
      console.error('Quote update error:', updateError);
      // Rollback everything
      await supabase.from('scope_lines').delete().eq('parent_id', salesOrderId);
      await supabase.from('specs').delete().eq('parent_id', salesOrderId);
      await supabase.from('notes').delete().eq('parent_id', salesOrderId);
      await supabase.from('attachments').delete().eq('parent_id', salesOrderId);
      await supabase.from('sales_orders').delete().eq('id', salesOrderId);
      return NextResponse.json(
        { error: 'Failed to update quote', details: updateError.message },
        { status: 500 }
      );
    }

    // 9. Return success with the new sales order
    return NextResponse.json({
      success: true,
      sales_order_id: salesOrderId,
      sales_order_base_number: baseNumber,
      message: `Quote Q${quote.base_number} converted to Sales Order SO${baseNumber}`,
    }, { status: 201 });

  } catch (error) {
    console.error('Quote conversion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
