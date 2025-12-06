'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Key,
  Rocket,
  Github,
  Loader2,
  LogIn,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';

const WORKFLOW_YAML = `name: TrainForge ML Training
on:
  workflow_dispatch:
    inputs:
      template:
        description: 'Training template'
        required: true
        default: 'cpu-small'
        type: choice
        options: [cpu-small, cpu-large, gpu-t4, gpu-a10]
      training_script:
        description: 'Path to training script'
        required: true
        default: 'train.py'
      max_runtime_hours:
        description: 'Maximum runtime (hours)'
        required: true
        default: '2'
        type: choice
        options: ['1', '2', '4', '8', '12', '24']`;

const AWS_SECRETS = [
  { name: 'AWS_ACCESS_KEY_ID', desc: 'Your AWS access key' },
  { name: 'AWS_SECRET_ACCESS_KEY', desc: 'Your AWS secret key' },
  { name: 'AWS_REGION', desc: 'AWS region (e.g., us-east-1)' },
];

function SetupContent() {
  const searchParams = useSearchParams();
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    currentInstallation,
    setCurrentInstallation,
    setUser,
  } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const hasRefreshedRef = useRef(false);

  // Refresh installations when returning from GitHub App install
  useEffect(() => {
    if (hasRefreshedRef.current) return;

    // GitHub redirects with ?installation_id=xxx&setup_action=install
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action');
    const savedAuth = localStorage.getItem('trainforge_auth');
    const savedToken = localStorage.getItem('trainforge_token');

    if (installationId && setupAction === 'install') {
      hasRefreshedRef.current = true;

      // If we have the token, fetch fresh installations from GitHub
      if (savedToken && savedAuth) {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

        fetch(`${API_URL}/auth/installations?token=${savedToken}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.installations?.length) {
              const userData = JSON.parse(savedAuth);
              userData.installations = data.installations;
              setUser(userData);
              setCurrentInstallation(data.installations[0]);
            }
          })
          .catch(console.error);
      } else if (savedAuth && user) {
        // Fallback: Use the installation_id from URL directly
        // This handles the case where user logged in before token saving was added
        const newInstallation = {
          id: parseInt(installationId),
          account_login: user.github_username,
        };
        const userData = JSON.parse(savedAuth);
        userData.installations = [newInstallation];
        setUser(userData);
        setCurrentInstallation(newInstallation);
      }
    }
  }, [searchParams, setUser, setCurrentInstallation, user]);

  const copyYaml = () => {
    navigator.clipboard.writeText(WORKFLOW_YAML);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await login();
    } catch {
      setIsConnecting(false);
    }
  };

  const handleInstallApp = async () => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const res = await fetch(`${API_URL}/auth/install-url`);
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  if (isLoading) {
    return (
      <div className="container py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Set Up TrainForge</h1>
          <p className="text-xl text-muted-foreground">
            Train ML models on your AWS account using GitHub Actions
          </p>
        </div>

        {/* Step 1: Connect GitHub */}
        <Card className={isAuthenticated ? 'border-green-500' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isAuthenticated ? 'bg-green-500 text-white' : 'bg-muted'
                  }`}
                >
                  {isAuthenticated ? <Check className="h-5 w-5" /> : '1'}
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" /> Connect GitHub
                  </CardTitle>
                  <CardDescription>
                    Sign in with GitHub to get started
                  </CardDescription>
                </div>
              </div>
              {user && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  <img
                    src={
                      user.avatar_url ||
                      `https://github.com/${user.github_username}.png`
                    }
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                  {user.github_username}
                </Badge>
              )}
            </div>
          </CardHeader>
          {!isAuthenticated && (
            <CardContent>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Connect with GitHub
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Step 2: Install App */}
        <Card
          className={
            currentInstallation
              ? 'border-green-500'
              : isAuthenticated
              ? ''
              : 'opacity-50'
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentInstallation ? 'bg-green-500 text-white' : 'bg-muted'
                  }`}
                >
                  {currentInstallation ? <Check className="h-5 w-5" /> : '2'}
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" /> Install TrainForge App
                  </CardTitle>
                  <CardDescription>
                    Grant access to your repositories
                  </CardDescription>
                </div>
              </div>
              {currentInstallation && (
                <Badge variant="secondary">
                  {currentInstallation.account_login}
                </Badge>
              )}
            </div>
          </CardHeader>
          {isAuthenticated && !currentInstallation && (
            <CardContent>
              <Button onClick={handleInstallApp} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" /> Install GitHub App
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Step 3: Start Training */}
        <Card className={!currentInstallation ? 'opacity-50' : ''}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                3
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" /> Start Training
                </CardTitle>
                <CardDescription>
                  Select a repository and launch your first job
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {currentInstallation && (
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/jobs/new">
                  <Rocket className="h-4 w-4 mr-2" /> Start Training Job
                </Link>
              </Button>
            </CardContent>
          )}
        </Card>

        {/* AWS Credentials Reminder */}
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Key className="h-5 w-5" /> Required: AWS Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Add these secrets to your GitHub repository. TrainForge never sees
              your credentials.
            </p>
            <div className="flex flex-wrap gap-2">
              {AWS_SECRETS.map((s) => (
                <Badge key={s.name} variant="outline" className="font-mono">
                  {s.name}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://docs.github.com/en/actions/security-guides/encrypted-secrets"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" /> How to add secrets
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Manual Setup Option */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" /> Manual Setup
            </CardTitle>
            <CardDescription>
              Prefer to set things up yourself? Copy the workflow file directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {WORKFLOW_YAML}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={copyYaml}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Save this as{' '}
              <code className="bg-muted px-1 rounded">
                .github/workflows/trainforge.yml
              </code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-12 flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
