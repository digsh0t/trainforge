'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const hasCalledRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls (React Strict Mode runs effects twice)
    if (hasCalledRef.current) return;
    hasCalledRef.current = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(
          searchParams.get('error_description') || 'Authorization was denied'
        );
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('Missing authorization code');
        return;
      }

      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const response = await fetch(
          `${API_URL}/auth/callback?code=${encodeURIComponent(code)}`
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Failed to authenticate');
        }

        const data = await response.json();

        // Save token for later use (refreshing installations)
        localStorage.setItem('trainforge_token', data.access_token);

        // Set user in context
        setUser({
          github_id: data.github_id,
          github_username: data.github_username,
          avatar_url: data.avatar_url,
          installations: data.installations,
        });

        setStatus('success');

        // Redirect after a short delay
        setTimeout(() => {
          if (data.installations.length > 0) {
            router.push('/jobs');
          } else {
            // User needs to install the GitHub App
            router.push('/setup?step=install');
          }
        }, 1500);
      } catch (error) {
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Authentication failed'
        );
      }
    };

    handleCallback();
  }, [searchParams, setUser, router]);

  return (
    <div className="container flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Authenticating...</CardTitle>
              <CardDescription>
                Please wait while we complete the authentication process.
              </CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle>Authentication Successful!</CardTitle>
              <CardDescription>
                Redirecting you to the dashboard...
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle>Authentication Failed</CardTitle>
              <CardDescription className="text-red-400">
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>

        {status === 'error' && (
          <CardContent className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => router.push('/')}>
              Go Home
            </Button>
            <Button onClick={() => router.push('/setup')}>Try Again</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container flex items-center justify-center min-h-[70vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
