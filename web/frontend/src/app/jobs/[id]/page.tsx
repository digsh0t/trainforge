'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params);

  // For now, since jobs are GitHub Actions runs, we'll show a simple redirect message
  // In a full implementation, we would fetch the run details from our backend

  return (
    <div className="container py-8 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild className="-ml-4">
        <Link href="/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Job Details</h1>
        <p className="text-muted-foreground">Job ID: {id}</p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Training Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Training jobs run as GitHub Actions workflows in your repository.
            All logs, artifacts, and status updates are available directly on
            GitHub.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild>
              <Link href="/jobs">View All Jobs</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/jobs/new">Start New Training</Link>
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">
              About GitHub Actions Integration
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Real-time logs available in your GitHub repository</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Artifacts automatically uploaded after completion</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Cancel or re-run jobs directly from GitHub</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Your AWS credentials never leave your repository</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
