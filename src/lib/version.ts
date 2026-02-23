/**
 * Version and build info — populated at build time via next.config.js env block.
 */

export const APP_VERSION: string =
  process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

export const GIT_SHA: string =
  process.env.NEXT_PUBLIC_GIT_SHA ?? 'unknown';

export const BUILD_TIMESTAMP: string =
  process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ?? '';

/** Short SHA for display (first 7 chars). */
export const GIT_SHA_SHORT: string = GIT_SHA.slice(0, 7);

/** Format an ISO timestamp into a readable local string, e.g. "Feb 23, 2026 12:30 PM" */
function formatBuildTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Formatted version string for UI display.
 * Example: "v1.0.0 (a3f8b2c) — Feb 23, 2026 12:30 PM"
 */
export function getVersionString(): string {
  const parts: string[] = [`v${APP_VERSION}`];

  if (GIT_SHA !== 'unknown') {
    parts.push(`(${GIT_SHA_SHORT})`);
  }

  if (BUILD_TIMESTAMP) {
    parts.push(`\u2014 ${formatBuildTimestamp(BUILD_TIMESTAMP)}`);
  }

  return parts.join(' ');
}
