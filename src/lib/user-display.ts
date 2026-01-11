/**
 * User Display Utilities
 *
 * Shared functions for formatting user display names consistently across the app.
 */

export interface UserMetadata {
  first_name?: string;
  last_name?: string;
}

/**
 * Format a user's display name for UI presentation.
 *
 * Format priority:
 * 1. "FirstName LastInitial." (e.g., "Bob M.") - if first_name and last_name available
 * 2. "FirstName" - if only first_name available
 * 3. Email prefix capitalized (e.g., "Bob" from "bob@example.com") - fallback
 * 4. "Unknown" - if no data available
 *
 * @param email - User's email address (optional)
 * @param metadata - User metadata containing first_name and last_name (optional)
 * @returns Formatted display name
 */
export function formatCreatorDisplay(
  email: string | null | undefined,
  metadata?: UserMetadata | null
): string {
  // Try to use metadata names first
  if (metadata?.first_name) {
    const firstName = metadata.first_name.trim();
    const lastName = metadata.last_name?.trim() || '';
    const lastInitial = lastName ? ` ${lastName.charAt(0).toUpperCase()}.` : '';
    return `${firstName}${lastInitial}`;
  }

  // Fall back to email prefix
  if (email) {
    const emailPrefix = email.split('@')[0];
    // Capitalize first letter
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }

  // No data available
  return 'Unknown';
}

/**
 * Get creator display string, returning null if no data.
 * Use this when you want to distinguish between "no creator info" (null) and "Unknown".
 *
 * @param email - User's email address (optional)
 * @param metadata - User metadata (optional)
 * @returns Formatted display name or null if no data
 */
export function getCreatorDisplayOrNull(
  email: string | null | undefined,
  metadata?: UserMetadata | null
): string | null {
  if (!email && !metadata?.first_name) {
    return null;
  }
  return formatCreatorDisplay(email, metadata);
}
