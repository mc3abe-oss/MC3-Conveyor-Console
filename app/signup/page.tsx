'use client';

import { useState } from 'react';
import { createClient } from '../../src/lib/supabase/browser';
import { getAuthCallbackUrl, logAuthEmailUrlSource } from '../../src/lib/auth/canonical-url';
import Link from 'next/link';
import MC3Logo from '../components/MC3Logo';
import { APP_NAME } from '../../src/lib/brand';

const ALLOWED_DOMAINS = ['@mc3mfg.com', '@clearcode.ca'];

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const validateEmail = (email: string): string | null => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!ALLOWED_DOMAINS.some((domain) => normalizedEmail.endsWith(domain))) {
      return `Only ${ALLOWED_DOMAINS.join(' or ')} email addresses are allowed.`;
    }
    return null;
  };

  const handleMagicLinkSignup = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
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
        shouldCreateUser: true, // Allow creating new users
      },
    });

    if (otpError) {
      if (otpError.message.includes('mc3mfg.com') || otpError.message.includes('clearcode.ca') || otpError.message.includes('not allowed')) {
        setError(`Only ${ALLOWED_DOMAINS.join(' or ')} email addresses are allowed.`);
      } else {
        setError(otpError.message);
      }
      setIsSendingMagicLink(false);
      return;
    }

    setMagicLinkSent(true);
    setIsSendingMagicLink(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Get the canonical production URL for email confirmation link
    // This ensures we never use preview deployment URLs
    const emailRedirectTo = getAuthCallbackUrl();
    logAuthEmailUrlSource(); // Log for debugging

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (signUpError) {
      // Handle domain restriction error from auth hook
      if (signUpError.message.includes('mc3mfg.com') || signUpError.message.includes('clearcode.ca') || signUpError.message.includes('not allowed')) {
        setError(`Only ${ALLOWED_DOMAINS.join(' or ')} email addresses are allowed.`);
      } else {
        setError(signUpError.message);
      }
      setIsLoading(false);
      return;
    }

    // Show success message
    setSuccess(true);
    setIsLoading(false);
  };

  if (success || magicLinkSent) {
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
                    We&apos;ve sent a {magicLinkSent ? 'magic link' : 'confirmation link'} to <strong>{email}</strong>.
                    Click the link to {magicLinkSent ? 'sign in and complete your account setup' : 'activate your account'}.
                  </p>
                </div>
              </div>
              <div className="text-center">
                <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                  Back to sign in
                </Link>
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
                  Create your account
                </p>
                <p className="mt-1 text-xs mc3-subtle">
                  Use your {ALLOWED_DOMAINS.join(' or ')} email address
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
                    autoComplete="new-password"
                    required
                    className="input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary py-3"
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
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
                  onClick={handleMagicLinkSignup}
                  disabled={isSendingMagicLink}
                  className="w-full btn btn-secondary py-3"
                >
                  {isSendingMagicLink ? 'Sending...' : 'Sign up with magic link'}
                </button>
              </div>

              <div className="text-center text-sm">
                <span className="text-gray-600">Already have an account? </span>
                <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
