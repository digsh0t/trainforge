import { Rocket } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Rocket className="h-4 w-4" />
          <span className="text-sm">TrainForge</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Built for ML engineers. Open source on{' '}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
