/**
 * GET /api/quotes/[id]/attachments
 * List all attachments for a quote
 *
 * POST /api/quotes/[id]/attachments
 * Create attachment metadata (file upload handled separately via Supabase Storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../../src/lib/supabase/server';
import { AttachmentTag } from '../../../../../src/lib/database/quote-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('parent_type', 'quote')
      .eq('parent_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Attachments fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attachments', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(attachments || []);
  } catch (error) {
    console.error('Attachments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // Check if quote exists and is not read-only
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('is_read_only')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.is_read_only) {
      return NextResponse.json(
        { error: 'Quote is read-only (already converted)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { file_path, file_name, file_size, mime_type, tag } = body;

    // Validate required fields
    if (!file_path || typeof file_path !== 'string') {
      return NextResponse.json({ error: 'file_path is required' }, { status: 400 });
    }

    if (!file_name || typeof file_name !== 'string') {
      return NextResponse.json({ error: 'file_name is required' }, { status: 400 });
    }

    // Validate tag enum
    const validTags: AttachmentTag[] = ['drawing', 'sketch', 'email', 'photo', 'other'];
    if (tag && !validTags.includes(tag)) {
      return NextResponse.json(
        { error: `Invalid tag. Must be one of: ${validTags.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: attachment, error } = await supabase
      .from('attachments')
      .insert({
        parent_type: 'quote',
        parent_id: id,
        file_path,
        file_name,
        file_size: file_size || null,
        mime_type: mime_type || null,
        tag: tag || 'other',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Attachment create error:', error);
      return NextResponse.json(
        { error: 'Failed to create attachment', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Attachments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachment_id');

    if (!attachmentId) {
      return NextResponse.json({ error: 'attachment_id query param required' }, { status: 400 });
    }

    // Check if quote is not read-only
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('is_read_only')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.is_read_only) {
      return NextResponse.json(
        { error: 'Quote is read-only (already converted)' },
        { status: 403 }
      );
    }

    // Soft delete the attachment
    const { error } = await supabase
      .from('attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', attachmentId)
      .eq('parent_id', id);

    if (error) {
      console.error('Attachment delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete attachment', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attachments DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
