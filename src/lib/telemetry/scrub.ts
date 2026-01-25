/**
 * Telemetry Scrubbing Utilities
 * Server-side data sanitization for telemetry events
 */

// Patterns for sensitive tokens
const TOKEN_PATTERNS = [
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*\.?[A-Za-z0-9\-_=]*/gi,
  // JWT-like tokens (three base64 segments)
  /eyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/g,
  // Azure SAS tokens
  /[?&](sig|se|sp|sv|sr|spr)=[^&\s]+/gi,
  // API keys (common patterns)
  /[?&](api[_-]?key|apikey|key|token|access[_-]?token|auth[_-]?token)=[^&\s]+/gi,
  // Supabase service role key pattern
  /service_role[^,}\s]*/gi,
  // Generic secret patterns
  /password[=:]["']?[^"'\s&]+["']?/gi,
  /secret[=:]["']?[^"'\s&]+["']?/gi,
];

/**
 * Strip query string from URL while preserving the path
 */
export function stripQueryString(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url, 'http://localhost');
    return `${parsed.pathname}`;
  } catch {
    // If URL parsing fails, try simple split
    const qIndex = url.indexOf('?');
    return qIndex > -1 ? url.substring(0, qIndex) : url;
  }
}

/**
 * Redact sensitive tokens from text
 */
export function redactTokens(text: string | undefined): string | undefined {
  if (!text) return text;

  let result = text;
  for (const pattern of TOKEN_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Truncate text to a maximum length
 */
export function truncate(
  text: string | undefined,
  max: number
): string | undefined {
  if (!text) return text;
  if (text.length <= max) return text;
  return text.substring(0, max) + '...[truncated]';
}

/**
 * Recursively scrub sensitive data from objects
 */
export function scrubData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return redactTokens(data);
  }

  if (Array.isArray(data)) {
    return data.map(scrubData);
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'authorization',
      'auth',
      'credential',
      'credentials',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'privateKey',
      'private_key',
    ];

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = scrubData(value);
      }
    }
    return result;
  }

  return data;
}

/**
 * Maximum limits for event fields
 */
export const LIMITS = {
  MESSAGE_MAX_LENGTH: 2000,
  STACK_MAX_LENGTH: 4000,
  MAX_EVENTS_PER_REQUEST: 100,
  DATA_MAX_DEPTH: 5,
} as const;

/**
 * Scrub an entire telemetry event
 */
export function scrubEvent(
  event: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...event,
    url: stripQueryString(event.url as string | undefined),
    message: truncate(
      redactTokens(event.message as string | undefined),
      LIMITS.MESSAGE_MAX_LENGTH
    ),
    stack: truncate(
      redactTokens(event.stack as string | undefined),
      LIMITS.STACK_MAX_LENGTH
    ),
    data: scrubData(event.data),
  };
}
