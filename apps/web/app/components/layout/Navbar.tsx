import { Button } from '@ui/components/ui/button';
import { ThemeToggle } from '@ui/components/theme-toggle';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link, NavLink as RouterNavLink } from 'react-router';
import { useEffect, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
};

const NAV_LINKS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/packages', label: 'Packages' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden px-4 lg:block">
      <div
        className={`
          pointer-events-auto mx-auto flex w-full max-w-6xl
          items-center justify-between gap-6 rounded-full
          px-5 transition-all duration-300 lg:px-7
          ${
            scrolled
              ? 'h-14 border border-border/60 bg-background/80 shadow-elevated backdrop-blur-xl'
              : 'h-16 border border-border/30 bg-background/50 backdrop-blur-md'
          }
        `}
      >
        {/* Logo */}
        <Link
          to="/"
          aria-label="Kafi Tour & Travel home"
          className="flex shrink-0 items-center gap-2.5"
        >
          <img
            src="/kafi-icon-gold.svg"
            alt=""
            width={36}
            height={36}
            className="size-9 object-contain transition-transform duration-300 hover:rotate-6 dark:hidden"
          />
          <img
            src="/kafi-icon-green.svg"
            alt=""
            width={36}
            height={36}
            className="hidden size-9 object-contain transition-transform duration-300 hover:rotate-6 dark:block"
          />
          <span className="flex gap-1.5 whitespace-nowrap font-heading text-base font-bold tracking-tight text-foreground">
            <span>KAFI</span>
            <span className="font-medium text-accent">TOURS</span>
          </span>
        </Link>

        {/* Main navigation */}
        <nav
          aria-label="Main navigation"
          className="flex min-w-0 items-center justify-center gap-1 xl:gap-2"
        >
          {NAV_LINKS.map((link) => (
            <RouterNavLink
              key={link.href}
              to={link.href}
              end={link.href === '/'}
              className={({ isActive }) =>
                [
                  'relative whitespace-nowrap px-3 py-2',
                  'text-sm font-semibold transition-colors duration-200',
                  'motion-reduce:transition-none',
                  'after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1',
                  'after:h-[3px] after:rounded-full after:bg-accent',
                  'after:transition-all after:duration-300',
                  isActive
                    ? 'text-foreground after:w-5'
                    : 'text-muted-foreground hover:text-foreground after:w-0',
                ].join(' ')
              }
            >
              {link.label}
            </RouterNavLink>
          ))}
        </nav>

        {/* Theme and booking actions */}
        <div className="flex shrink-0 items-center gap-2.5">
          <ThemeToggle />
          <Button
            render={<Link to="/booking" />}
            className="
              h-10 gap-2 rounded-full px-5
              text-sm font-semibold shadow-soft
              transition-transform hover:-translate-y-0.5
              motion-reduce:transition-none
            "
          >
            Book Umrah
            <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
