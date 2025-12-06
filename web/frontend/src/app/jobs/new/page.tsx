'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Rocket,
  Loader2,
  GitBranch,
  FileCode,
  Settings,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TemplateCard } from '@/components/templates/template-card';
import { useAuth } from '@/lib/auth-context';
import { workflowsApi, reposApi, Repository, mapTemplate } from '@/lib/api';
import { Template } from '@/types';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

function NewJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get('template');
  const {
    user,
    currentInstallation,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingUpRepo, setSettingUpRepo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [runCommand, setRunCommand] = useState('python train.py');
  const [requirementsFile, setRequirementsFile] = useState('requirements.txt');
  const [maxHours, setMaxHours] = useState(4);
  const [artifactsPath, setArtifactsPath] = useState('results/');

  useEffect(() => {
    if (authLoading || !currentInstallation || !user) {
      setIsLoading(false);
      return;
    }
    Promise.all([
      reposApi.list(
        currentInstallation.id,
        user.github_id,
        user.github_username
      ),
      workflowsApi.getTemplates(),
    ]).then(([reposRes, templatesRes]) => {
      // Show all repos, not just those with workflow
      if (reposRes.data) setRepos(reposRes.data);
      if (templatesRes.data) {
        const mapped = templatesRes.data.templates.map(mapTemplate);
        setTemplates(mapped);
        if (preselectedTemplate) {
          const t = mapped.find((t) => t.id === preselectedTemplate);
          if (t) setSelectedTemplate(t);
        }
      }
      setIsLoading(false);
    });
  }, [currentInstallation, user, authLoading, preselectedTemplate]);

  const handleSetupWorkflow = async (repo: Repository) => {
    if (!currentInstallation) return;
    setSettingUpRepo(repo.id);
    setError(null);
    const result = await reposApi.setupWorkflow(
      currentInstallation.id,
      repo.owner,
      repo.name
    );
    if (result.error) {
      setError(result.error);
    } else {
      // Update the repo in local state to show it now has workflow
      setRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, has_workflow: true } : r))
      );
    }
    setSettingUpRepo(null);
  };

  const handleLaunch = async () => {
    if (!currentInstallation || !selectedRepo || !selectedTemplate) return;
    setIsSubmitting(true);
    setError(null);
    const result = await workflowsApi.trigger(
      currentInstallation.id,
      selectedRepo.owner,
      selectedRepo.name,
      {
        template: selectedTemplate.id,
        run_command: runCommand,
        requirements_file: requirementsFile,
        max_runtime_hours: maxHours,
        artifacts_path: artifactsPath,
      }
    );
    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else if (result.data?.success) {
      if (result.data.run_url) window.open(result.data.run_url, '_blank');
      router.push('/jobs');
    } else {
      setError(result.data?.message || 'Failed');
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container py-8 flex justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !currentInstallation) {
    return (
      <div className="container py-8 max-w-4xl text-center py-12 border rounded-lg">
        <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Connect GitHub first</h2>
        <Button asChild>
          <Link href="/setup">Go to Setup</Link>
        </Button>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" asChild className="-ml-4 mb-6">
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="text-center py-12 border rounded-lg">
          <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No repositories found</h2>
          <p className="text-muted-foreground mb-4">
            Make sure the TrainForge GitHub App has access to your repositories.
          </p>
          <Button asChild>
            <Link href="/setup">Check Setup</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Button variant="ghost" asChild className="-ml-4 mb-6">
        <Link href="/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>
      <h1 className="text-3xl font-bold mb-2">New Training Job</h1>
      <p className="text-muted-foreground mb-8">
        Configure and launch your ML training
      </p>

      <div className="flex items-center justify-between mb-8 max-w-md">
        {[1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center font-medium border-2',
                step > s
                  ? 'bg-primary border-primary text-primary-foreground'
                  : step === s
                  ? 'border-primary text-primary'
                  : 'border-muted text-muted-foreground'
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {i < 2 && (
              <div
                className={cn(
                  'w-16 h-0.5 mx-2',
                  step > s ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 rounded-lg text-red-500">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Select Repository</h2>
              <p className="text-sm text-muted-foreground">
                Choose a repository with TrainForge workflow, or set one up.
              </p>
              <div className="grid gap-3">
                {repos.map((repo) => (
                  <Card
                    key={repo.id}
                    className={cn(
                      repo.has_workflow &&
                        'cursor-pointer hover:border-primary/50',
                      selectedRepo?.id === repo.id &&
                        'border-primary ring-2 ring-primary/20',
                      !repo.has_workflow && 'opacity-75'
                    )}
                    onClick={() => repo.has_workflow && setSelectedRepo(repo)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GitBranch className="h-5 w-5" />
                        <span className="font-medium">{repo.full_name}</span>
                        {repo.has_workflow ? (
                          <Badge variant="secondary" className="text-xs">
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No workflow
                          </Badge>
                        )}
                      </div>
                      {repo.has_workflow ? (
                        selectedRepo?.id === repo.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetupWorkflow(repo);
                          }}
                          disabled={settingUpRepo === repo.id}
                        >
                          {settingUpRepo === repo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Settings className="h-4 w-4 mr-1" />
                              Set up
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Select Infrastructure</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    showPricing={false}
                    selected={selectedTemplate?.id === t.id}
                    onSelect={setSelectedTemplate}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Configure & Launch</h2>

              {/* AWS Secrets Reminder */}
              <div className="p-4 border rounded-lg bg-blue-500/10 border-blue-500/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      AWS Credentials Required
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Make sure you have added these secrets to your repository
                      before launching:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">
                          AWS_ACCESS_KEY_ID
                        </code>
                      </li>
                      <li className="flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">
                          AWS_SECRET_ACCESS_KEY
                        </code>
                      </li>
                    </ul>
                    <a
                      href={`https://github.com/${selectedRepo?.owner}/${selectedRepo?.name}/settings/secrets/actions`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                    >
                      Manage secrets in repository settings
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-4 grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Repository:</span>{' '}
                    <span className="font-medium">
                      {selectedRepo?.full_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Template:</span>{' '}
                    <span className="font-medium">
                      {selectedTemplate?.name}
                    </span>{' '}
                    <span className="text-muted-foreground">
                      (${selectedTemplate?.hourly_cost.toFixed(3)}/hr)
                    </span>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Label>Run Command</Label>
                <Input
                  value={runCommand}
                  onChange={(e) => setRunCommand(e.target.value)}
                  placeholder="python train.py"
                />
                <p className="text-xs text-muted-foreground">
                  Command to run your training (e.g., &quot;python
                  train.py&quot;, &quot;./train.sh&quot;, or &quot;pip install
                  -r requirements.txt &amp;&amp; python train.py&quot;)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Requirements File</Label>
                <Input
                  value={requirementsFile}
                  onChange={(e) => setRequirementsFile(e.target.value)}
                  placeholder="requirements.txt"
                />
                <p className="text-xs text-muted-foreground">
                  Path to requirements.txt (installed before running command)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Runtime</Label>
                <Select
                  value={maxHours.toString()}
                  onValueChange={(v) => setMaxHours(parseInt(v))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 4, 8, 12, 24].map((h) => (
                      <SelectItem key={h} value={h.toString()}>
                        {h} hour{h > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Artifacts Path</Label>
                <Input
                  value={artifactsPath}
                  onChange={(e) => setArtifactsPath(e.target.value)}
                  placeholder="results/"
                />
                <p className="text-xs text-muted-foreground">
                  Paths to save as artifacts after training (e.g.,
                  &quot;results/&quot;, &quot;model.pt&quot;,
                  &quot;checkpoints/&quot;)
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-yellow-500/10 border-yellow-500/50">
                <strong>Est. max cost:</strong> $
                {((selectedTemplate?.hourly_cost || 0) * maxHours).toFixed(2)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((step - 1) as Step)}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep((step + 1) as Step)}
            disabled={step === 1 ? !selectedRepo : !selectedTemplate}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleLaunch}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Launching...' : 'Launch Training'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8 flex justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <NewJobContent />
    </Suspense>
  );
}
