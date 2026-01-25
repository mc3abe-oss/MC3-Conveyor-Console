'use client';

/**
 * Client Telemetry Module
 * Provides telemetry tracking for client-side events
 */

import type { TelemetryEvent, TelemetrySeverity } from './types';

const FLUSH_INTERVAL_MS = 2000;
const DEDUPE_WINDOW_MS = 5000;
const MAX_QUEUE_SIZE = 100;
const SESSION_ID_KEY = 'telemetry_session_id';
const TRACE_ID_KEY = 'telemetry_trace_id';

/**
 * Generate a simple fingerprint for deduplication
 * Hash of: event_type + message (first 100 chars) + stack (first line)
 */
function generateFingerprint(event: Partial<TelemetryEvent>): string {
  const parts = [
    event.event_type || '',
    (event.message || '').substring(0, 100),
    (event.stack || '').split('\n')[0] || '',
  ];
  // Simple hash using string combination and base36
  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create session ID (persists across page loads)
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Get or create trace ID (new per browser session)
 */
function getTraceId(): string {
  if (typeof window === 'undefined') return '';

  let traceId = sessionStorage.getItem(TRACE_ID_KEY);
  if (!traceId) {
    traceId = generateUUID();
    sessionStorage.setItem(TRACE_ID_KEY, traceId);
  }
  return traceId;
}

/**
 * Get current viewport dimensions
 */
function getViewport(): string {
  if (typeof window === 'undefined') return '';
  return `${window.innerWidth}x${window.innerHeight}`;
}

class TelemetryClient {
  private queue: TelemetryEvent[] = [];
  private recentFingerprints: Map<string, number> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  private isDisabled(): boolean {
    if (typeof process !== 'undefined') {
      const disabled = process.env.NEXT_PUBLIC_TELEMETRY_DISABLED;
      return disabled === '1' || disabled === 'true';
    }
    return false;
  }

  /**
   * Initialize the telemetry client (called from TelemetryBootstrap)
   */
  init(): void {
    if (this.isInitialized || this.isDisabled()) return;
    if (typeof window === 'undefined') return;

    this.isInitialized = true;

    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, FLUSH_INTERVAL_MS);

    // Best-effort flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush().catch(() => {});
    });

    // Clean up old fingerprints periodically
    setInterval(() => {
      const now = Date.now();
      for (const [fp, time] of this.recentFingerprints) {
        if (now - time > DEDUPE_WINDOW_MS) {
          this.recentFingerprints.delete(fp);
        }
      }
    }, DEDUPE_WINDOW_MS);
  }

  /**
   * Track a telemetry event
   */
  track(event: Partial<TelemetryEvent>): void {
    if (this.isDisabled()) return;
    if (typeof window === 'undefined') return;

    // Generate fingerprint for deduplication
    const fingerprint = event.fingerprint || generateFingerprint(event);

    // Check for recent duplicate
    const lastSeen = this.recentFingerprints.get(fingerprint);
    if (lastSeen && Date.now() - lastSeen < DEDUPE_WINDOW_MS) {
      return; // Skip duplicate
    }
    this.recentFingerprints.set(fingerprint, Date.now());

    // Build full event
    const fullEvent: TelemetryEvent = {
      event_type: event.event_type || 'unknown',
      severity: event.severity || 'info',
      fingerprint,
      app: 'conveyor-console',
      env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      session_id: getSessionId(),
      trace_id: getTraceId(),
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      viewport: getViewport(),
      ...event,
    };

    // Add to queue (cap size)
    this.queue.push(fullEvent);
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue.shift();
    }
  }

  /**
   * Flush queued events to the server
   */
  async flush(): Promise<void> {
    if (this.isDisabled()) return;
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        // Re-queue events on failure (but don't exceed max)
        const requeue = [...events, ...this.queue].slice(0, MAX_QUEUE_SIZE);
        this.queue = requeue;
      }
    } catch {
      // Re-queue events on network error
      const requeue = [...events, ...this.queue].slice(0, MAX_QUEUE_SIZE);
      this.queue = requeue;
    }
  }

  /**
   * Track an error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track({
      event_type: 'error.tracked',
      severity: 'error',
      message: error.message,
      stack: error.stack,
      data: context,
    });
  }

  /**
   * Track an API error
   */
  trackApiError(
    url: string,
    status: number,
    body?: string,
    context?: Record<string, unknown>
  ): void {
    const severity: TelemetrySeverity = status >= 500 ? 'error' : 'warning';
    this.track({
      event_type: 'error.api',
      severity,
      message: `API ${status}: ${url}`,
      url,
      data: {
        status,
        body: body?.substring(0, 500),
        ...context,
      },
    });
  }

  /**
   * Track a network error
   */
  trackNetworkError(url: string, error: Error): void {
    this.track({
      event_type: 'error.network',
      severity: 'error',
      message: `Network error: ${url}`,
      url,
      stack: error.stack,
      data: { error: error.message },
    });
  }

  /**
   * Track a rule firing
   */
  trackRuleFired(
    rule_id: string,
    severity: TelemetrySeverity,
    message: string,
    context?: {
      product_key?: string;
      application_id?: string;
      model_key?: string;
      config_fingerprint?: string;
    }
  ): void {
    this.track({
      event_type: 'rules.rule_fired',
      severity,
      rule_id,
      message,
      ...context,
    });
  }

  /**
   * Track calculation start
   */
  trackCalcStart(
    calc_key: string,
    context?: {
      product_key?: string;
      application_id?: string;
      model_key?: string;
    }
  ): void {
    this.track({
      event_type: 'calc.run_start',
      severity: 'info',
      calc_key,
      ...context,
    });
  }

  /**
   * Track calculation success
   */
  trackCalcSuccess(
    calc_key: string,
    duration_ms: number,
    context?: {
      product_key?: string;
      application_id?: string;
      model_key?: string;
    }
  ): void {
    this.track({
      event_type: 'calc.run_success',
      severity: 'info',
      calc_key,
      data: { duration_ms },
      ...context,
    });
  }

  /**
   * Track calculation error
   */
  trackCalcError(
    calc_key: string,
    error: string,
    context?: {
      product_key?: string;
      application_id?: string;
      model_key?: string;
      stack?: string;
    }
  ): void {
    this.track({
      event_type: 'calc.run_error',
      severity: 'error',
      calc_key,
      message: error,
      ...context,
    });
  }

  /**
   * Track application load start
   */
  trackApplicationLoadStart(application_id: string): void {
    this.track({
      event_type: 'application.load_start',
      severity: 'info',
      application_id,
    });
  }

  /**
   * Track application load success
   */
  trackApplicationLoadSuccess(
    application_id: string,
    duration_ms: number
  ): void {
    this.track({
      event_type: 'application.load_success',
      severity: 'info',
      application_id,
      data: { duration_ms },
    });
  }

  /**
   * Track application load error
   */
  trackApplicationLoadError(
    application_id: string,
    error: string,
    stack?: string
  ): void {
    this.track({
      event_type: 'application.load_error',
      severity: 'error',
      application_id,
      message: error,
      stack,
    });
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const telemetry = new TelemetryClient();

/**
 * Fetch wrapper that logs API errors to telemetry
 */
export async function telemetryFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const body = await response.clone().text().catch(() => '');
      telemetry.trackApiError(url, response.status, body);
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      telemetry.trackNetworkError(url, error);
    }
    throw error;
  }
}
