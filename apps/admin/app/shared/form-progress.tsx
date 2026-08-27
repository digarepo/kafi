import { Check } from 'lucide-react';
import { cn } from '@kafi/ui';

/**
 * Compact horizontal step progress indicator.
 *
 * @remarks
 * - Uses the app's brand colors: deep emerald (brand-primary) for completed
 *   steps and gold (brand-gold) for the current step.
 * - Minimal vertical footprint — no card wrapper, just the steps and a
 *   connecting line.
 * - Mobile: numbered circles only with a small label under the active step.
 *   Desktop (`sm+`): numbered circles with labels under every step.
 * - Steps are clickable when `onStepChange` is provided, allowing navigation
 *   back to previous steps.
 */

export interface FormProgressStep {
  key: string;
  label: string;
}

export interface FormProgressProps {
  steps: FormProgressStep[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  className?: string;
}

export function FormProgress({
  steps,
  currentStep,
  onStepChange,
  className,
}: FormProgressProps) {
  const active = Math.min(Math.max(currentStep, 0), steps.length - 1);
  const total = steps.length;

  return (
    <nav
      aria-label="Form progress"
      className={cn('w-full select-none', className)}
    >
      <div className="relative">
        {/* Background line — spans from center of first circle to center of last */}
        <div
          className="absolute top-4 h-0.5 rounded-full bg-border"
          style={{
            left: `calc(100% / ${total} / 2)`,
            right: `calc(100% / ${total} / 2)`,
          }}
          aria-hidden="true"
        />
        {/* Progress line — fills proportionally to the current step */}
        <div
          className="absolute top-4 h-0.5 rounded-full bg-brand-primary transition-[width] duration-500 ease-out"
          style={{
            left: `calc(100% / ${total} / 2)`,
            width:
              total > 1
                ? `calc((100% - 100% / ${total}) * ${active / (total - 1)})`
                : '0%',
          }}
          aria-hidden="true"
        />
        <ol
          className="relative flex"
          role="list"
          aria-label="Registration steps"
        >
          {steps.map((step, index) => {
            const completed = index < active;
            const current = index === active;
            const clickable = !!onStepChange && index <= active;

            return (
              <li key={step.key} className="flex flex-1 flex-col items-center">
                <button
                  type="button"
                  onClick={() => clickable && onStepChange?.(index)}
                  disabled={!clickable}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background text-xs font-semibold transition-all duration-300 sm:h-9 sm:w-9',
                    completed &&
                      'bg-brand-primary text-white border-brand-primary',
                    current &&
                      'bg-brand-gold text-white border-brand-gold ring-2 ring-brand-gold/30',
                    !completed &&
                      !current &&
                      'bg-muted text-muted-foreground border-border',
                    clickable && 'cursor-pointer hover:scale-105',
                    !clickable && 'cursor-default',
                  )}
                >
                  {completed ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </button>
                <span
                  className={cn(
                    'mt-1.5 hidden w-full overflow-hidden text-center text-xs leading-tight sm:block',
                    current && 'font-semibold text-foreground',
                    completed && 'text-brand-primary',
                    !completed && !current && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {/* Mobile: show label only for current step */}
                <span
                  className={cn(
                    'mt-1 block w-full overflow-hidden text-center text-[10px] leading-tight sm:hidden',
                    current ? 'font-semibold text-foreground' : 'invisible',
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
