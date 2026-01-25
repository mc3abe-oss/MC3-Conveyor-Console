import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '../../../../src/lib/auth/require';
import { supabaseAdmin } from '../../../../src/lib/supabase/client';
import type { TelemetryEventRow, TelemetryQueryParams, TopIssue } from '../../../../src/lib/telemetry/types';

/**
 * GET /api/admin/telemetry
 * Query telemetry events (super admin only)
 */
export async function GET(request: NextRequest) {
  // Require super admin
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  // Check service role availability
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server configuration error: service role not available' },
      { status: 500 }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const params: TelemetryQueryParams = {
    q: searchParams.get('q') || undefined,
    severity: searchParams.get('severity') as TelemetryQueryParams['severity'] || undefined,
    event_type: searchParams.get('event_type') || undefined,
    release: searchParams.get('release') || undefined,
    product_key: searchParams.get('product_key') || undefined,
    application_id: searchParams.get('application_id') || undefined,
    rule_id: searchParams.get('rule_id') || undefined,
    limit: Math.min(parseInt(searchParams.get('limit') || '100', 10), 500),
    offset: parseInt(searchParams.get('offset') || '0', 10),
  };

  // Build query
  let query = supabaseAdmin
    .from('telemetry_events')
    .select('*')
    .order('created_at', { ascending: false })
    .range(params.offset || 0, (params.offset || 0) + (params.limit || 100) - 1);

  // Apply filters
  if (params.severity) {
    query = query.eq('severity', params.severity);
  }
  if (params.event_type) {
    query = query.eq('event_type', params.event_type);
  }
  if (params.release) {
    query = query.eq('release', params.release);
  }
  if (params.product_key) {
    query = query.eq('product_key', params.product_key);
  }
  if (params.application_id) {
    query = query.eq('application_id', params.application_id);
  }
  if (params.rule_id) {
    query = query.eq('rule_id', params.rule_id);
  }
  if (params.q) {
    // Search in message field
    query = query.ilike('message', `%${params.q}%`);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error('Telemetry query error:', error);
    return NextResponse.json(
      { error: 'Failed to query events' },
      { status: 500 }
    );
  }

  // Get top issues (grouped by fingerprint)
  let topIssuesRaw: TopIssue[] | null = null;
  try {
    const result = await supabaseAdmin.rpc('get_top_telemetry_issues', {
      limit_count: 10,
    });
    topIssuesRaw = result.data;
  } catch {
    // RPC may not exist yet, that's okay
  }

  // If RPC doesn't exist, compute from events
  let topIssues: TopIssue[] = [];
  if (topIssuesRaw) {
    topIssues = topIssuesRaw;
  } else if (events && events.length > 0) {
    // Fallback: compute from returned events
    const issueMap = new Map<string, {
      count: number;
      last_seen: string;
      sample_message: string;
      sample_event_type: string;
      severity: string;
      sessions: Set<string>;
    }>();

    for (const event of events as TelemetryEventRow[]) {
      const fp = event.fingerprint || 'unknown';
      const existing = issueMap.get(fp);
      if (existing) {
        existing.count++;
        if (event.created_at > existing.last_seen) {
          existing.last_seen = event.created_at;
          existing.sample_message = event.message || '';
        }
        if (event.session_id) {
          existing.sessions.add(event.session_id);
        }
      } else {
        issueMap.set(fp, {
          count: 1,
          last_seen: event.created_at,
          sample_message: event.message || '',
          sample_event_type: event.event_type,
          severity: event.severity,
          sessions: new Set(event.session_id ? [event.session_id] : []),
        });
      }
    }

    topIssues = Array.from(issueMap.entries())
      .map(([fingerprint, data]) => ({
        fingerprint,
        count: data.count,
        last_seen: data.last_seen,
        sample_message: data.sample_message,
        sample_event_type: data.sample_event_type,
        severity: data.severity as TopIssue['severity'],
        affected_sessions: data.sessions.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Get distinct event types for filters
  const { data: eventTypes } = await supabaseAdmin
    .from('telemetry_events')
    .select('event_type')
    .limit(100);

  const distinctEventTypes = eventTypes
    ? [...new Set(eventTypes.map((e) => e.event_type))].sort()
    : [];

  // Get distinct product keys for filters
  const { data: productKeys } = await supabaseAdmin
    .from('telemetry_events')
    .select('product_key')
    .not('product_key', 'is', null)
    .limit(100);

  const distinctProductKeys = productKeys
    ? [...new Set(productKeys.map((e) => e.product_key).filter(Boolean))].sort()
    : [];

  return NextResponse.json({
    events: events || [],
    topIssues,
    filters: {
      eventTypes: distinctEventTypes,
      productKeys: distinctProductKeys,
    },
    pagination: {
      offset: params.offset || 0,
      limit: params.limit || 100,
      hasMore: (events?.length || 0) === (params.limit || 100),
    },
  });
}
