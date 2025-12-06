'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cpu, Zap, DollarSign, Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Template } from '@/types';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: Template;
  showPricing?: boolean;
  selected?: boolean;
  onSelect?: (template: Template) => void;
}

export function TemplateCard({
  template,
  showPricing = true,
  selected,
  onSelect,
}: TemplateCardProps) {
  const [hours, setHours] = useState(4);
  const estimatedCost = template.hourly_cost * hours;
  const isGpu = template.gpu_type !== null;

  return (
    <Card
      className={cn(
        'transition-all hover:border-primary/50',
        selected && 'border-primary ring-2 ring-primary/20'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          {isGpu ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              <Zap className="mr-1 h-3 w-3" />
              GPU
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Cpu className="mr-1 h-3 w-3" />
              CPU
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{template.description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Instance</span>
            <span className="font-mono">{template.instance_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">vCPU</span>
            <span>{template.vcpu}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Memory</span>
            <span>{template.memory_gb}GB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Storage</span>
            <span>{template.storage_gb}GB</span>
          </div>
          {isGpu && (
            <div className="col-span-2 flex justify-between">
              <span className="text-muted-foreground">GPU</span>
              <span className="text-emerald-500">{template.gpu_type}</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1">
          {template.features.slice(0, 4).map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>

        {/* Pricing Calculator */}
        {showPricing && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated runtime</span>
              <span className="font-medium">{hours} hours</span>
            </div>
            <Slider
              value={[hours]}
              onValueChange={([value]) => setHours(value)}
              min={1}
              max={24}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Est. cost</span>
              <span className="text-lg font-bold text-primary">
                ${estimatedCost.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center text-lg font-semibold">
          <DollarSign className="h-4 w-4" />
          <span>{template.hourly_cost.toFixed(3)}</span>
          <span className="text-sm text-muted-foreground font-normal">/hr</span>
        </div>
        {onSelect ? (
          <Button
            onClick={() => onSelect(template)}
            variant={selected ? 'default' : 'outline'}
          >
            {selected ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                Selected
              </>
            ) : (
              'Select'
            )}
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/jobs/new?template=${template.id}`}>Select</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
