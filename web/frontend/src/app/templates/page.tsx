'use client';

import { useState, useEffect } from 'react';
import { Cpu, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateCard } from '@/components/templates/template-card';
import { workflowsApi, mapTemplate } from '@/lib/api';
import { Template } from '@/types';

type Filter = 'all' | 'cpu' | 'gpu';

export default function TemplatesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      const result = await workflowsApi.getTemplates();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setTemplates(result.data.templates.map(mapTemplate));
      }
      setIsLoading(false);
    }
    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter((template) => {
    if (filter === 'all') return true;
    if (filter === 'gpu') return template.gpu_type !== null;
    if (filter === 'cpu') return template.gpu_type === null;
    return true;
  });

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Failed to load templates: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Infrastructure Templates</h1>
        <p className="text-muted-foreground">
          Choose the right hardware for your training job. All templates include
          Docker, Python, and PyTorch.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'cpu' ? 'default' : 'outline'}
          onClick={() => setFilter('cpu')}
        >
          <Cpu className="mr-2 h-4 w-4" />
          CPU Only
        </Button>
        <Button
          variant={filter === 'gpu' ? 'default' : 'outline'}
          onClick={() => setFilter('gpu')}
        >
          <Zap className="mr-2 h-4 w-4" />
          GPU
        </Button>
      </div>

      {/* Template Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {/* Pricing Note */}
      <div className="border-t pt-8">
        <div className="bg-muted/50 rounded-lg p-6 space-y-2">
          <h3 className="font-semibold">Pricing Notes</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Prices are per hour of compute time</li>
            <li>
              • Billing starts when the instance launches and stops when it
              terminates
            </li>
            <li>
              • Infrastructure is automatically cleaned up after job completion
            </li>
            <li>
              • S3 storage for artifacts is billed separately at standard AWS
              rates
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
