import { redirect } from 'next/navigation';

/**
 * Root page - redirects to the default product in the console.
 */
export default function RootPage() {
  redirect('/console/belt');
}
