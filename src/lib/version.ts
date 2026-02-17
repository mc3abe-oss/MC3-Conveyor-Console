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

/**
 * Formatted version string for UI display.
 * Example: "v1.0.0 (a3f8b2c) — 2026-02-17T14:30:00Z"
 */
export function getVersionString(): string {
  const parts: string[] = [`v${APP_VERSION}`];

  if (GIT_SHA !== 'unknown') {
    parts.push(`(${GIT_SHA_SHORT})`);
  }

  if (BUILD_TIMESTAMP) {
    parts.push(`\u2014 ${BUILD_TIMESTAMP}`);
  }

  return parts.join(' ');
}
