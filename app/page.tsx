import { redirect } from 'next/navigation';

/**
 * Root page - redirects to the default product in the console.
 *
 * This maintains backwards compatibility: visiting "/" takes users
 * directly to the sliderbed calculator within the console shell.
 */
export default function RootPage() {
  redirect('/console/sliderbed');
}
