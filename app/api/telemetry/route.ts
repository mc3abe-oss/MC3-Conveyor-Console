import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase/client';
import { scrubEvent, LIMITS } from '../../../src/lib/telemetry/scrub';
import type { TelemetryEvent, TelemetryIngestPayload } from '../../../src/lib/telemetry/types';

/**
 * POST /api/telemetry
 * Ingest telemetry events (no auth required - anonymous client sends)
 */
export async function POST(request: NextRequest) {
  // Check service role availability
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server configuration error: service role not available' },
      { status: 500 }
    );
  }

  // Parse request body
  let payload: TelemetryIngestPayload | TelemetryEvent;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  // Normalize to array of events
  let events: TelemetryEvent[];
  if ('events' in payload && Array.isArray(payload.events)) {
    events = payload.events;
  } else if ('event_type' in payload) {
    // Single event object
    events = [payload as TelemetryEvent];
  } else {
    return NextResponse.json(
      { error: 'Invalid payload: expected { events: [...] } or single event object' },
      { status: 400 }
    );
  }

  // Validate event count
  if (events.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  if (events.length > LIMITS.MAX_EVENTS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many events: max ${LIMITS.MAX_EVENTS_PER_REQUEST} per request` },
      { status: 400 }
    );
  }

  // Validate and scrub events
  const validSeverities = ['error', 'warning', 'info'];
  const scrubbedEvents = events.map((event) => {
    // Ensure required fields
    if (!event.event_type || typeof event.event_type !== 'string') {
      throw new Error('event_type is required');
    }
    if (!event.severity || !validSeverities.includes(event.severity)) {
      throw new Error('severity must be one of: error, warning, info');
    }

    // Scrub sensitive data
    return scrubEvent(event as unknown as Record<string, unknown>);
  });

  // Insert events
  try {
    const { error } = await supabaseAdmin
      .from('telemetry_events')
      .insert(scrubbedEvents);

    if (error) {
      console.error('Telemetry insert error:', error);
      return NextResponse.json(
        { error: 'Failed to insert events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ inserted: scrubbedEvents.length });
  } catch (error) {
    console.error('Telemetry insert exception:', error);
    return NextResponse.json(
      { error: 'Failed to insert events' },
      { status: 500 }
    );
  }
}
