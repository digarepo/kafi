import { useEffect, useState } from 'react';
import { Button, ThemeToggle } from '@kafi/ui';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';

/**
 * Represents one desktop navigation item in the landing navbar.
 */
type NavLink = {
  href: string;
  label: string;
};

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/packages', label: 'Packages' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function stage(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1);
}

export function Navbar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollProgress(clamp(window.scrollY / 180, 0, 1));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const revealProgress = easeOutCubic(stage(scrollProgress, 0.02, 0.35));
  const splitProgress = easeOutCubic(stage(scrollProgress, 0.28, 1));

  const sharedOpacity = revealProgress * (1 - splitProgress);
  const bubbleOpacity = revealProgress * splitProgress;

  const logoTextOpacity = 1 - splitProgress;
  const logoTextWidth = `${(1 - splitProgress) * 190}px`;

  const sharedScaleX = 1 - splitProgress * 0.08;
  const sharedBlur = 10 + revealProgress * 10;
  const bubbleShadow = `0 ${splitProgress * 10}px ${
    splitProgress * 30
  }px rgba(0, 0, 0, ${splitProgress * 0.1})`;

  const leftOffset = `${splitProgress * -6}px`;
  const rightOffset = `${splitProgress * 6}px`;
  const centerScale = 1 - splitProgress * 0.04;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full pointer-events-none">
      <div className="relative mx-auto h-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="absolute left-4 right-4 top-4 h-12 sm:left-6 sm:right-6 lg:left-8 lg:right-8">
          <div
            className="absolute inset-0 rounded-full border border-accent/20 bg-linear-to-b from-accent/10 to-accent/25 shadow-soft backdrop-blur-lg dark:border-primary/25 dark:from-primary/15 dark:to-primary/30"
            style={{
              opacity: sharedOpacity,
              transform: `scaleX(${sharedScaleX})`,
              filter: `blur(${(1 - revealProgress) * 4}px)`,
              backdropFilter: `blur(${sharedBlur}px)`,
            }}
          />

          <div
            className="pointer-events-auto absolute left-0 top-0 flex h-12 items-center gap-2 transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${leftOffset})`,
            }}
          >
            <div
              className="absolute inset-0 rounded-full border border-accent/20 bg-linear-to-b from-accent/10 to-accent/25 backdrop-blur-md dark:border-primary/25 dark:from-primary/15 dark:to-primary/30"
              style={{
                opacity: bubbleOpacity,
                boxShadow: bubbleShadow,
              }}
            />

            <a
              href="#hero"
              className="relative flex h-12 items-center gap-2 px-3"
              aria-label="Kafi Tours home"
            >
              <img
                src="/kafi-icon-green.svg"
                alt="Kafi Tours Logo"
                className="block h-10 w-10 transition-transform duration-300 hover:rotate-12 dark:hidden"
              />
              <img
                src="/kafi-icon-gold.svg"
                alt="Kafi Tours Logo"
                className="hidden h-10 w-10 transition-transform duration-300 hover:rotate-12 dark:block"
              />
              <span
                className="flex gap-1.5 overflow-hidden whitespace-nowrap font-heading text-sm font-bold tracking-tight text-foreground"
                style={{
                  opacity: logoTextOpacity,
                  maxWidth: logoTextWidth,
                }}
              >
                <span>KAFI</span>
                <span className="font-medium text-accent">TOURS</span>
              </span>
            </a>
          </div>

          <div
            className="pointer-events-auto absolute left-1/2 top-0 hidden h-12 items-center gap-6 px-4 transition-transform duration-300 ease-out md:flex"
            style={{
              transform: `translateX(-50%) scale(${centerScale})`,
              transformOrigin: 'center',
            }}
          >
            <div
              className="absolute inset-0 rounded-full border border-accent/20 bg-linear-to-b from-accent/10 to-accent/25 backdrop-blur-md dark:border-primary/25 dark:from-primary/15 dark:to-primary/30"
              style={{
                opacity: bubbleOpacity,
                boxShadow: bubbleShadow,
              }}
            />

            <nav className="relative flex items-center gap-5 lg:gap-7">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <ThemeToggle />
            </nav>

            <span className="relative h-4 w-px bg-border/40" />
          </div>

          <div
            className="pointer-events-auto absolute right-0 top-0 hidden h-12 items-center gap-3 transition-transform duration-300 ease-out md:flex"
            style={{
              transform: `translateX(${rightOffset})`,
            }}
          >
            <div
              className="absolute inset-0 rounded-full border border-accent/20 bg-linear-to-b from-accent/10 to-accent/25 backdrop-blur-md dark:border-primary/25 dark:from-primary/15 dark:to-primary/30"
              style={{
                opacity: bubbleOpacity,
                boxShadow: bubbleShadow,
              }}
            />

            <Link to={'/packages'}>
              <Button className="relative btn-primary flex h-8 items-center rounded-full hover:scale-110 gap-1.5 px-4 mx-4 text-xs shadow-soft">
                Book a Trip
                <ArrowRightIcon weight="bold" className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
