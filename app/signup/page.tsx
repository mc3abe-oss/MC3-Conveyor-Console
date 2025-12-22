'use client';

import { useState } from 'react';
import { createClient } from '../../src/lib/supabase/browser';
import Link from 'next/link';

const ALLOWED_DOMAINS = ['@mc3mfg.com', '@clearcode.ca'];

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): string | null => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!ALLOWED_DOMAINS.some((domain) => normalizedEmail.endsWith(domain))) {
      return `Only ${ALLOWED_DOMAINS.join(' or ')} email addresses are allowed.`;
    }
    return null;
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

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-center text-3xl font-bold text-gray-900">
              Check your email
            </h1>
            <p className="mt-4 text-center text-gray-600">
              We've sent a confirmation link to <strong>{email}</strong>.
              Click the link to activate your account.
            </p>
          </div>
          <div className="text-center">
            <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Belt Conveyor Calculator
          </h1>
          <h2 className="mt-2 text-center text-xl text-gray-600">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Use your {ALLOWED_DOMAINS.join(' or ')} email address
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
