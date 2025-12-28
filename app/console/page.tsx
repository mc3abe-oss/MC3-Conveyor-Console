import { redirect } from 'next/navigation';

/**
 * Console landing page - redirects to the default product.
 *
 * /console → /console/sliderbed
 */
export default function ConsolePage() {
  redirect('/console/sliderbed');
}
