import { cn } from '@ui/lib/utils';
import { haptic } from '@ui/lib/haptics';
import { useTheme } from '@ui/providers/theme-provider';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { Button } from './ui/button';

type ThemeMode = 'light' | 'system' | 'dark';

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'Auto', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const MOBILE_THEME_OPTIONS: ThemeMode[] = ['light', 'dark'];

/**
 * Renders a responsive theme control that expands on desktop and cycles themes on mobile.
 *
 * @returns The theme toggle control.
 *
 * @remarks
 * - Desktop keeps the hover-to-expand three-option behavior.
 * - Mobile shows only the active option and cycles to the next theme on tap.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const activeTheme =
    THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[1];

  const cycleTheme = () => {
    const currentTheme = theme === 'system' ? 'light' : theme;

    const activeIndex = MOBILE_THEME_OPTIONS.indexOf(currentTheme);

    const nextTheme =
      MOBILE_THEME_OPTIONS[(activeIndex + 1) % MOBILE_THEME_OPTIONS.length];

    haptic(8);
    setTheme(nextTheme);
  };

  return (
    <>
      <button
        type="button"
        onClick={cycleTheme}
        className={cn(
          'relative inline-flex h-13.5 w-13.5 md:h-10.5 md:w-10.5 items-center justify-center rounded-full border border-border/50 bg-background/95 p-1',
          'backdrop-blur-md shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          'md:hidden',
        )}
        aria-label={`Switch theme. Current theme is ${activeTheme.label}.`}
      >
        <span className="relative grid h-11 md:h-8 w-11 md:w-8 place-items-center rounded-full bg-brand-gold text-primary shadow-md">
          <activeTheme.icon className="relative z-10 h-5.5 w-5.5" />
          <span className="absolute inset-0 rounded-full bg-linear-to-b from-accent/20 to-transparent pointer-events-none" />
        </span>
      </button>

      <div
        className={cn(
          'group relative hidden items-center rounded-full border border-border/50 bg-background/95 p-1',
          'backdrop-blur-md shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          'overflow-hidden md:inline-flex md:w-10.5 md:hover:w-31 md:hover:gap-1',
        )}
      >
        {THEME_OPTIONS.map((option) => (
          <ThemeButton
            key={option.value}
            isActive={theme === option.value}
            onClick={() => setTheme(option.value)}
            icon={option.icon}
            label={option.label}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Renders one desktop theme option button.
 *
 * @param isActive - Whether this option is the currently selected theme.
 * @param onClick - Selects this theme option.
 * @param icon - Icon shown for the theme option.
 * @param label - Accessible label for the theme option.
 * @returns A theme option button.
 */
function ThemeButton({
  isActive,
  onClick,
  icon: Icon,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        haptic(8);
        onClick();
      }}
      className={cn(
        'relative h-8 w-8 rounded-full transition-all duration-300 shrink-0',
        isActive
          ? 'bg-brand-gold text-primary shadow-md z-20 opacity-100'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        !isActive &&
          'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:absolute md:left-1 md:group-hover:relative md:group-hover:left-0',
        isActive && 'relative opacity-100',
      )}
    >
      <Icon className="h-3.5 w-3.5 relative z-10" />
      <span className="sr-only">{label}</span>

      {isActive && (
        <div className="absolute inset-0 rounded-full bg-linear-to-b from-accent/20 to-transparent pointer-events-none" />
      )}
    </Button>
  );
}
