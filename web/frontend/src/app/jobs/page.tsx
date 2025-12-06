'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Briefcase,
  Clock,
  CheckCircle2,
  Loader2,
  ExternalLink,
  XCircle,
  AlertCircle,
  GitBranch,
  StopCircle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/jobs/stats-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import { workflowsApi, reposApi, TrainingRun, Repository } from '@/lib/api';

function StatusIcon({
  status,
  conclusion,
}: {
  status: string;
  conclusion?: string;
}) {
  if (status === 'queued' || status === 'in_progress')
    return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
  if (conclusion === 'success')
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (conclusion === 'failure')
    return <XCircle className="h-4 w-4 text-red-500" />;
  if (conclusion === 'cancelled')
    return <AlertCircle className="h-4 w-4 text-gray-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function StatusBadge({
  status,
  conclusion,
}: {
  status: string;
  conclusion?: string;
}) {
  if (status === 'queued') return <Badge variant="secondary">Queued</Badge>;
  if (status === 'in_progress')
    return <Badge className="bg-yellow-500">Running</Badge>;
  if (conclusion === 'success')
    return <Badge className="bg-green-500">Completed</Badge>;
  if (conclusion === 'failure')
    return <Badge variant="destructive">Failed</Badge>;
  if (conclusion === 'cancelled')
    return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

type RunWithRepo = TrainingRun & { repo_name: string };

export default function JobsPage() {
  const {
    currentInstallation,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const [tab, setTab] = useState('all');
  const [runs, setRuns] = useState<RunWithRepo[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingRunId, setCancelingRunId] = useState<number | null>(null);
  const [downloadingRunId, setDownloadingRunId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!currentInstallation) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    (async () => {
      const reposResult = await reposApi.list(currentInstallation.id);
      if (reposResult.error) {
        setError(reposResult.error);
        setIsLoading(false);
        return;
      }
      const repositories = reposResult.data || [];
      setRepos(repositories);

      const allRuns: RunWithRepo[] = [];
      for (const repo of repositories.filter((r) => r.has_workflow)) {
        const runsResult = await workflowsApi.listRuns(
          currentInstallation.id,
          repo.owner,
          repo.name,
          10
        );
        if (runsResult.data)
          allRuns.push(
            ...runsResult.data.map((run) => ({
              ...run,
              repo_name: repo.full_name,
            }))
          );
      }
      allRuns.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRuns(allRuns);
      setIsLoading(false);
    })();
  }, [currentInstallation, authLoading]);

  const handleCancelRun = async (run: RunWithRepo) => {
    if (!currentInstallation) return;

    // Parse owner and repo from repo_name (format: "owner/repo")
    const [owner, repo] = run.repo_name.split('/');

    setCancelingRunId(run.github_run_id);
    const result = await workflowsApi.cancelRun(
      currentInstallation.id,
      owner,
      repo,
      run.github_run_id
    );

    if (result.data?.success) {
      // Update the run status locally
      setRuns((prev) =>
        prev.map((r) =>
          r.github_run_id === run.github_run_id
            ? { ...r, status: 'completed', conclusion: 'cancelled' }
            : r
        )
      );
    }
    setCancelingRunId(null);
  };

  const handleDownloadArtifacts = async (run: RunWithRepo) => {
    if (!currentInstallation) return;

    const [owner, repo] = run.repo_name.split('/');
    setDownloadingRunId(run.github_run_id);

    try {
      // First, get list of artifacts for this run
      const artifactsResult = await workflowsApi.listArtifacts(
        currentInstallation.id,
        owner,
        repo,
        run.github_run_id
      );

      if (artifactsResult.error || !artifactsResult.data?.artifacts?.length) {
        alert('No artifacts found for this run');
        setDownloadingRunId(null);
        return;
      }

      // Download each artifact (usually there's just one: training-results)
      for (const artifact of artifactsResult.data.artifacts) {
        if (artifact.expired) continue;

        const downloadResult = await workflowsApi.getArtifactDownloadUrl(
          currentInstallation.id,
          owner,
          repo,
          artifact.id
        );

        if (downloadResult.data?.download_url) {
          // Open download URL in new tab
          window.open(downloadResult.data.download_url, '_blank');
        }
      }
    } catch (e) {
      console.error('Failed to download artifacts:', e);
    }

    setDownloadingRunId(null);
  };

  const filtered = runs.filter((r) => {
    if (tab === 'running')
      return r.status === 'queued' || r.status === 'in_progress';
    if (tab === 'completed') return r.conclusion === 'success';
    if (tab === 'failed')
      return r.conclusion === 'failure' || r.conclusion === 'cancelled';
    return true;
  });

  const runningCount = runs.filter(
    (r) => r.status === 'queued' || r.status === 'in_progress'
  ).length;
  const completedCount = runs.filter((r) => r.conclusion === 'success').length;
  const failedCount = runs.filter(
    (r) => r.conclusion === 'failure' || r.conclusion === 'cancelled'
  ).length;

  if (authLoading || isLoading) {
    return (
      <div className="container py-8 flex justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !currentInstallation) {
    return (
      <div className="container py-8 text-center py-12 border rounded-lg">
        <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">
          Connect GitHub to view jobs
        </h2>
        <Button asChild>
          <Link href="/setup">Go to Setup</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training Jobs</h1>
          <p className="text-muted-foreground">
            Manage and monitor your ML training jobs
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Jobs"
          value={runs.length}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatsCard
          title="Running"
          value={runningCount}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatsCard
          title="Completed"
          value={completedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatsCard
          title="Repositories"
          value={repos.filter((r) => r.has_workflow).length}
          icon={<GitBranch className="h-5 w-5" />}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({runs.length})</TabsTrigger>
          <TabsTrigger value="running">Running ({runningCount})</TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCount})
          </TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedCount})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-6">
          {filtered.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            status={run.status}
                            conclusion={run.conclusion}
                          />
                          <span className="font-medium">{run.repo_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {run.template ? (
                          <Badge variant="outline">{run.template}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={run.status}
                          conclusion={run.conclusion}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(run.started_at || run.created_at),
                          { addSuffix: true }
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(run.status === 'queued' ||
                            run.status === 'in_progress') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRun(run)}
                              disabled={cancelingRunId === run.github_run_id}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              title="Cancel run"
                            >
                              {cancelingRunId === run.github_run_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <StopCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {run.conclusion === 'success' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadArtifacts(run)}
                              disabled={downloadingRunId === run.github_run_id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                              title="Download artifacts"
                            >
                              {downloadingRunId === run.github_run_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {run.github_run_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              title="View on GitHub"
                            >
                              <a
                                href={run.github_run_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground mb-4">
                {repos.filter((r) => r.has_workflow).length === 0
                  ? 'No repositories with TrainForge workflow'
                  : 'No training jobs found'}
              </p>
              <Button asChild>
                <Link href="/jobs/new">Start your first training job</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
