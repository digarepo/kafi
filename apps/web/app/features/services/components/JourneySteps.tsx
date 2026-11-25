import { useEffect, useState } from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react';

import { Button } from '@ui/components/ui/button';
import { Card } from '@ui/components/ui/card';
import { Separator } from '@ui/components/ui/separator';

import { journeySteps } from '../data/journey-steps';
import { Link } from 'react-router';

const AUTO_PLAY_DURATION = 5000;

export function JourneySteps() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const activeStep = journeySteps[activeIndex];

  useEffect(() => {
    let animationFrame: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;

      const currentProgress = Math.min(
        (elapsed / AUTO_PLAY_DURATION) * 100,
        100,
      );

      setProgress(currentProgress);

      if (currentProgress >= 100) {
        setActiveIndex((currentIndex) => {
          return (currentIndex + 1) % journeySteps.length;
        });

        setProgress(0);
        startTime = timestamp;
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const goToStep = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
  };

  return (
    <Card className="w-full max-w-105 border-border/40 bg-linear-to-b from-accent/0 to-accent/10 p-6 shadow-elevated backdrop-blur-md">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              The Kafi Journey
            </span>

            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              How It Works
            </h2>
          </div>

          <span className="text-xs font-semibold text-muted-foreground">
            {activeStep.number} / {journeySteps.length}
          </span>
        </div>

        {/* Progress Timeline */}
        <div className="flex gap-2">
          {journeySteps.map((step, index) => {
            const isActive = index === activeIndex;
            const isCompleted = index < activeIndex;

            const barWidth = isCompleted ? 100 : isActive ? progress : 0;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(index)}
                aria-label={`Go to step ${index + 1}`}
                aria-current={isActive ? 'step' : undefined}
                className="group flex-1 space-y-1.5 text-left"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={[
                      'text-xs font-semibold tracking-widest transition-colors duration-300',
                      isActive
                        ? 'text-accent'
                        : isCompleted
                          ? 'text-accent/60'
                          : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    {step.number}
                  </span>
                </div>

                <div className="relative h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={[
                      'absolute inset-y-0 left-0 rounded-full',
                      isActive
                        ? 'bg-accent'
                        : isCompleted
                          ? 'bg-accent/50'
                          : 'bg-transparent',
                    ].join(' ')}
                    style={{
                      width: `${barWidth}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Step */}
        <div className="space-y-2">
          <h3 className="font-heading text-base font-semibold text-primary">
            {activeStep.title}
          </h3>

          <p className="text-sm leading-6 text-muted-foreground sm:text-sm">
            {activeStep.description}
          </p>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            Your journey, handled with care.
          </span>

          <Link to="/packages" className="shrink-0">
            <Button size="sm" className="h-9 gap-1.5 px-3 text-xs">
              Explore Packages
              <ArrowRightIcon weight="bold" className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
