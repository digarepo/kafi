import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { DecorativeBackground } from '@kafi/ui';

interface StatusItem {
  label: string;
  status: 'complete' | 'progress' | 'pending';
}

const statusItems: StatusItem[] = [
  { label: 'Design', status: 'progress' },
  { label: 'Backend', status: 'progress' },
  { label: 'Integration', status: 'progress' },
  { label: 'Launch', status: 'pending' },
];

function StatusBadge({ status }: { status: StatusItem['status'] }) {
  if (status === 'complete') {
    return (
      <div className="w-5 h-5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 flex items-center justify-center">
        <svg
          className="w-3 h-3 text-brand-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    );
  }

  if (status === 'progress') {
    return (
      <div className="w-5 h-5 rounded-full bg-brand-gold/10 dark:bg-brand-gold/20 flex items-center justify-center">
        <Loader2 className="w-3 h-3 text-brand-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function ConstructionIllustration() {
  return (
    <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto mb-8 animate-fade-in">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-border/50 animate-[spin_20s_linear_infinite]" />

      {/* Middle ring */}
      <div className="absolute inset-4 rounded-full border border-border/30 animate-[spin_15s_linear_infinite_reverse]" />

      {/* Inner glow */}
      <div className="absolute inset-8 rounded-full bg-linear-to-br from-brand-primary/5 to-brand-gold/5 dark:from-brand-primary/10 dark:to-brand-gold/10 shadow-glow animate-pulse-glow" />

      {/* Center icon container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-linear-to-br from-brand-primary to-brand-light dark:from-brand-primary dark:to-brand-dark flex items-center justify-center shadow-elevated transform rotate-12 hover:rotate-0 transition-transform duration-500">
          <svg
            className="w-10 h-10 md:w-12 md:h-12 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.504a2.086 2.086 0 000-2.342L10.5 5.25M11.42 15.17l-4.67 4.67m0 0a2.25 2.25 0 01-3.182 0l-1.406-1.406a2.25 2.25 0 010-3.182l4.67-4.67M7.5 14.25l-1.5-1.5m0 0l1.5-1.5m-1.5 1.5h5.25"
            />
          </svg>
        </div>
      </div>

      {/* Floating dots */}
      <div className="absolute top-2 left-1/2 w-2 h-2 rounded-full bg-brand-gold/60 animate-float" />
      <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-brand-primary/40 animate-float-delayed" />
      <div
        className="absolute top-1/3 right-2 w-1 h-1 rounded-full bg-brand-gold/30 animate-float"
        style={{ animationDelay: '1s' }}
      />
    </div>
  );
}

export default function ComingSoonPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center">
      <DecorativeBackground variant="ambient" />

      <div className="relative z-10 w-full max-w-xl mx-auto px-6 py-12">
        <div
          className={`text-center ${mounted ? 'animate-fade-in' : 'opacity-0'}`}
        >
          {/* Illustration */}
          <ConstructionIllustration />

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/50 text-xs font-medium text-muted-foreground mb-6 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
            In Development
          </div>

          {/* Heading */}
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4 tracking-tight animate-slide-up"
            style={{ animationDelay: '0.15s' }}
          >
            We're Building Something Exceptional
          </h1>

          {/* Description */}
          <p
            className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto mb-8 animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            This section is being carefully crafted to deliver a seamless
            experience. We appreciate your patience as we put the finishing
            touches in place.
          </p>

          {/* Status Card */}
          <div
            className="card p-5 mb-8 max-w-xs mx-auto animate-scale-in"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="space-y-3">
              {statusItems.map((item, _index) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between group"
                >
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {item.label}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div
            className="flex items-center gap-4 mb-8 animate-fade-in"
            style={{ animationDelay: '0.35s' }}
          >
            <div className="flex-1 h-px bg-linear-to-r from-transparent via-border to-transparent" />
            <div className="w-1 h-1 rounded-full bg-border" />
            <div className="flex-1 h-px bg-linear-to-r from-transparent via-border to-transparent" />
          </div>

          {/* Actions */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up"
            style={{ animationDelay: '0.4s' }}
          >
            <a href="/" className="btn-primary">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                setTimeout(
                  () =>
                    document
                      .getElementById('contact')
                      ?.scrollIntoView({ behavior: 'smooth' }),
                  100,
                );
                window.location.hash = '/';
              }}
              className="btn-outline"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>

        {/* Subtle footer text */}
        <p
          className={`text-center text-xs text-muted-foreground/60 mt-12 ${mounted ? 'animate-fade-in-slow' : 'opacity-0'}`}
        >
          Expected launch: Coming soon
        </p>
      </div>
    </div>
  );
}
