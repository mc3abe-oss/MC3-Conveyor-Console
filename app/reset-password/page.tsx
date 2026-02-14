'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MC3Logo from '../components/MC3Logo';
import { APP_NAME } from '../../src/lib/brand';
import { createClient } from '../../src/lib/supabase/browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check if we have a valid recovery session
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Check for recovery flow - Supabase sets this when coming from a reset email
      if (session?.user) {
        setIsValidSession(true);
        return;
      }

      // Check if there's a hash fragment with access_token (Supabase recovery flow)
      // The hash is handled by Supabase client automatically
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsValidSession(true);
          }
        }
      );

      cleanupFn = () => subscription.unsubscribe();

      // Give it a moment to process the hash
      setTimeout(() => {
        setIsValidSession((current) => current === null ? false : current);
      }, 1000);
    };

    void checkSession();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mc3-mist/80 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mc3-navy mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if no valid session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mc3-mist/80 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[480px]">
          <div className="mc3-surface rounded-lg overflow-hidden">
            <div className="h-1 bg-red-500" />
            <div className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <MC3Logo size={140} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-mc3-navy">Invalid or Expired Link</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    This password reset link is invalid or has expired.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Password reset links expire after 1 hour. Please request a new link.
                </p>
              </div>

              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="inline-block w-full btn btn-primary py-3 text-center"
                >
                  Request New Link
                </Link>
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

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mc3-mist/80 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[480px]">
          <div className="mc3-surface rounded-lg overflow-hidden">
            <div className="h-1 bg-green-500" />
            <div className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <MC3Logo size={140} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-mc3-navy">Password Reset!</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Your password has been reset successfully.
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Redirecting you to sign in...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show reset form
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
                <p className="mt-1 text-sm mc3-subtle">Set your new password</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="label">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="input"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary py-3"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
