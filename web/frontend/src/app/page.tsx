'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket,
  FileCode,
  Key,
  Play,
  ArrowRight,
  Zap,
  Shield,
  DollarSign,
  Github,
  Lock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemplateCard } from '@/components/templates/template-card';
import { workflowsApi, mapTemplate } from '@/lib/api';
import { Template } from '@/types';

const STEPS = [
  {
    icon: FileCode,
    title: 'Add Workflow File',
    desc: 'Copy our GitHub Actions template to your repository',
  },
  {
    icon: Key,
    title: 'Set AWS Credentials',
    desc: 'Add your AWS keys to GitHub Secrets (never shared with us)',
  },
  {
    icon: Play,
    title: 'Run & Train',
    desc: 'Trigger the workflow, get results as GitHub Artifacts',
  },
];

const BENEFITS = [
  {
    icon: Shield,
    title: 'Zero Trust Security',
    desc: 'Your credentials never leave your GitHub repo',
  },
  {
    icon: Zap,
    title: 'Infinite Scale',
    desc: 'Uses GitHub Actions runners, not our servers',
  },
  {
    icon: DollarSign,
    title: 'Pay Direct',
    desc: 'Pay AWS directly, no middleman markup',
  },
  {
    icon: Lock,
    title: 'Full Control',
    desc: 'Your code, your account, your infrastructure',
  },
];

export default function HomePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    workflowsApi.getTemplates().then((res) => {
      if (res.data) setTemplates(res.data.templates.map(mapTemplate));
      setIsLoading(false);
    });
  }, []);

  const featured = templates.filter((t) =>
    ['gpu-t4', 'cpu-small', 'gpu-a10'].includes(t.id)
  );

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="container py-24 space-y-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Badge variant="secondary">
            <Github className="h-3 w-3 mr-1" /> Powered by GitHub Actions
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Train ML Models
            <br />
            <span className="text-primary">On Your Own Terms</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Run ML training on your AWS account using GitHub Actions. No
            third-party access to your code or credentials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" asChild>
              <Link href="/setup">
                <Rocket className="mr-2 h-5 w-5" />
                Get Started
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/templates">
                View Templates
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container py-16 border-t">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center space-y-4">
              <div className="relative">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
              </div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section className="container py-16 border-t">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Available Templates</h2>
          <Button variant="ghost" asChild>
            <Link href="/templates">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            (featured.length ? featured : templates.slice(0, 3)).map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="container py-16 border-t">
        <h2 className="text-2xl font-bold text-center mb-12">
          Why TrainForge?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((b) => (
            <Card key={b.title}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 border-t">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Train Your Model?</h2>
          <p className="text-muted-foreground">
            Set up in 5 minutes. Keep full control of your code and credentials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/setup">
                <Rocket className="mr-2 h-5 w-5" />
                Start Setup
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/trainforge/trainforge"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
