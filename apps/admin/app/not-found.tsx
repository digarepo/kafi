import { useEffect, useState } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { DecorativeBackground } from '@kafi/ui';

function NotFoundIllustration() {
  return (
    <div className="relative w-64 h-40 md:w-80 md:h-48 mx-auto mb-10 animate-fade-in">
      {/* Abstract geometric composition */}
      <svg
        viewBox="0 0 320 200"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background subtle shapes */}
        <circle cx="160" cy="100" r="80" className="fill-muted/50 dark:fill-muted/30 animate-pulse-glow" />

        {/* Floating rectangular panels */}
        <g className="animate-float">
          <rect
            x="60"
            y="50"
            width="60"
            height="80"
            rx="8"
            className="fill-card stroke-border/50"
            strokeWidth="1"
          />
          <rect
            x="70"
            y="60"
            width="40"
            height="8"
            rx="2"
            className="fill-muted-foreground/20"
          />
          <rect
            x="70"
            y="75"
            width="35"
            height="4"
            rx="1"
            className="fill-muted-foreground/10"
          />
          <rect
            x="70"
            y="85"
            width="30"
            height="4"
            rx="1"
            className="fill-muted-foreground/10"
          />
        </g>

        <g className="animate-float-delayed">
          <rect
            x="200"
            y="70"
            width="60"
            height="80"
            rx="8"
            className="fill-card stroke-border/50"
            strokeWidth="1"
          />
          <circle cx="230" cy="95" r="15" className="fill-brand-gold/20 stroke-brand-gold/40" strokeWidth="1" />
          <rect
            x="210"
            y="125"
            width="40"
            height="6"
            rx="2"
            className="fill-muted-foreground/15"
          />
        </g>

        {/* Central connecting element - abstract path */}
        <path
          d="M120 100 Q160 60 200 100"
          className="stroke-brand-primary/30 dark:stroke-brand-primary/40"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />

        {/* Floating particles */}
        <circle cx="140" cy="40" r="3" className="fill-brand-gold/50 animate-float" />
        <circle cx="250" cy="45" r="2" className="fill-brand-primary/40 animate-float-delayed" />
        <circle cx="80" cy="150" r="2.5" className="fill-brand-gold/30 animate-float" style={{ animationDelay: '1.5s' }} />
        <circle cx="270" cy="140" r="2" className="fill-brand-primary/30 animate-float-delayed" style={{ animationDelay: '0.5s' }} />

        {/* Small decorative squares */}
        <rect x="45" y="30" width="8" height="8" rx="2" className="fill-brand-primary/20 animate-float" style={{ animationDelay: '0.8s' }} />
        <rect x="265" y="160" width="6" height="6" rx="1" className="fill-brand-gold/20 animate-float-delayed" style={{ animationDelay: '1.2s' }} />
      </svg>

      {/* Glow effect behind */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-32 h-32 rounded-full bg-brand-primary/5 dark:bg-brand-primary/10 blur-2xl animate-pulse-glow" />
      </div>
    </div>
  );
}

export default function NotFoundPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center">
      <DecorativeBackground variant="subtle" />

      <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-12">
        <div className={`text-center ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
          {/* Large 404 */}
          <div className="relative mb-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-[8rem] md:text-[10rem] font-heading font-bold text-foreground/5 dark:text-foreground/3 select-none block leading-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <NotFoundIllustration />
            </div>
          </div>

          {/* Refined heading */}
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            This Page Has Vanished
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            The page you're looking for has moved, no longer exists, or never existed in the first place. Let's get you back on track.
          </p>

          {/* Divider with dots */}
          <div className="flex items-center justify-center gap-3 mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex gap-1.5">
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="w-1 h-1 rounded-full bg-brand-gold/40" />
              <div className="w-1 h-1 rounded-full bg-border" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: '0.35s' }}>
            <a
              href="/"
              className="btn-primary"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </a>
            <button
              onClick={() => window.history.back()}
              className="btn-outline"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>

        {/* Subtle help text */}
        <p className={`text-center text-xs text-muted-foreground/50 mt-16 ${mounted ? 'animate-fade-in-slow' : 'opacity-0'}`}>
          Need assistance? Contact our support team.
        </p>
      </div>
    </div>
  );
}
