import { Button } from '@ui/components/ui/button';
import { ThemeToggle } from '@ui/components/theme-toggle';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link, NavLink as RouterNavLink } from 'react-router';

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
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden px-4 lg:block">
      <div
        className="
          pointer-events-auto mx-auto flex h-16 w-full max-w-6xl
          items-center justify-between gap-6 rounded-full
          border border-accent/20
          bg-linear-to-b from-accent/10 to-accent/25
          px-5 shadow-soft backdrop-blur-xl
          dark:border-primary/25
          dark:from-primary/15 dark:to-primary/30
          lg:px-7
        "
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
            width={40}
            height={40}
            className="size-10 object-contain transition-transform duration-300 hover:rotate-6 dark:hidden"
          />

          <img
            src="/kafi-icon-green.svg"
            alt=""
            width={40}
            height={40}
            className="hidden size-10 object-contain transition-transform duration-300 hover:rotate-6 dark:block"
          />

          <span className="flex gap-1.5 whitespace-nowrap font-heading text-base font-bold tracking-tight text-foreground xl:text-lg">
            <span>KAFI</span>
            <span className="font-medium text-accent">TOURS</span>
          </span>
        </Link>

        {/* Main navigation */}
        <nav
          aria-label="Main navigation"
          className="flex min-w-0 items-center justify-center gap-3 xl:gap-5"
        >
          {NAV_LINKS.map((link) => (
            <RouterNavLink
              key={link.href}
              to={link.href}
              end={link.href === '/'}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap rounded-full px-2.5 py-2',
                  'text-sm font-semibold transition-colors duration-200',
                  'motion-reduce:transition-none',
                  isActive
                    ? 'bg-accent/15 text-foreground'
                    : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground',
                ].join(' ')
              }
            >
              {link.label}
            </RouterNavLink>
          ))}
        </nav>

        {/* Theme and booking actions */}
        <div className="flex shrink-0 items-center gap-3">
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
            Plan My Umrah
            <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
