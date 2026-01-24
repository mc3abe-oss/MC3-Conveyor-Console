import { redirect } from 'next/navigation';

/**
 * Console landing page - redirects to the Quotes list.
 *
 * /console → /console/quotes
 *
 * Users should use "New Application" to create applications,
 * which routes through the Product Picker first.
 */
export default function ConsolePage() {
  redirect('/console/quotes');
}
