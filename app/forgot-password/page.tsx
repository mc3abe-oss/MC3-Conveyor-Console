'use client';

import { useState } from 'react';
import Link from 'next/link';
import MC3Logo from '../components/MC3Logo';
import { APP_NAME } from '../../src/lib/brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
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
                  <h1 className="text-2xl font-semibold text-mc3-navy">Check Your Email</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  The link will expire in 1 hour. Check your spam folder if you don&apos;t see it.
                </p>
              </div>

              <div className="text-center">
                <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                  Back to Sign In
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
        <div className="mc3-surface rounded-lg overflow-hidden">
          <div className="h-1 bg-mc3-gold" />

          <div className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <MC3Logo size={140} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-mc3-navy">{APP_NAME}</h1>
                <p className="mt-1 text-sm mc3-subtle">Reset your password</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <p className="text-sm text-gray-600">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

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
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary py-3"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>

              <div className="text-center text-sm">
                <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                  Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
