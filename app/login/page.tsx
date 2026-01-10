'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../src/lib/supabase/browser';
import { getAuthCallbackUrl } from '../../src/lib/auth/canonical-url';
import Link from 'next/link';
import MC3Logo from '../components/MC3Logo';
import { APP_NAME } from '../../src/lib/brand';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    // Redirect to home on success
    router.push('/');
    router.refresh();
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setError(null);
    setIsSendingMagicLink(true);

    const supabase = createClient();
    const emailRedirectTo = getAuthCallbackUrl();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo,
        shouldCreateUser: false, // Only allow existing users
      },
    });

    if (otpError) {
      setError(otpError.message);
      setIsSendingMagicLink(false);
      return;
    }

    setMagicLinkSent(true);
    setIsSendingMagicLink(false);
  };

  // Show success message after magic link sent
  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mc3-mist/80 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[480px]">
          <div className="mc3-surface rounded-lg overflow-hidden">
            <div className="h-1 bg-mc3-gold" />
            <div className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <MC3Logo size={140} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-mc3-navy">
                    Check your email
                  </h1>
                  <p className="mt-4 text-sm mc3-subtle">
                    We&apos;ve sent a magic link to <strong>{email}</strong>.
                    Click the link to sign in.
                  </p>
                </div>
              </div>
              <div className="text-center">
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mc3-mist/80 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[480px]">
        {/* Card with gold accent bar */}
        <div className="mc3-surface rounded-lg overflow-hidden">
          {/* Gold accent bar */}
          <div className="h-1 bg-mc3-gold" />

          <div className="p-8 space-y-6">
            {/* Logo and Title */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <MC3Logo size={140} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-mc3-navy">
                  {APP_NAME}
                </h1>
                <p className="mt-1 text-sm mc3-subtle">
                  Sign in to your account
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input"
                    placeholder="you@mc3mfg.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary py-3"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Magic Link Button */}
              <div>
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isSendingMagicLink}
                  className="w-full btn btn-secondary py-3"
                >
                  {isSendingMagicLink ? 'Sending...' : 'Send me a magic link'}
                </button>
              </div>

              <div className="text-center text-sm space-y-2">
                <div>
                  <Link href="/forgot-password" className="text-primary-600 hover:text-primary-500 font-medium">
                    Forgot your password?
                  </Link>
                </div>
                <div>
                  <span className="text-gray-600">Don&apos;t have an account? </span>
                  <Link href="/signup" className="text-primary-600 hover:text-primary-500 font-medium">
                    Sign up
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
