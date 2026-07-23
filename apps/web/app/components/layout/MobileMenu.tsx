import { useEffect, useState } from 'react';
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  ThemeToggle,
} from '@kafi/ui';
import {
  HouseIcon,
  InfoIcon,
  ListIcon,
  PackageIcon,
  PhoneCallIcon,
  QuestionIcon,
  SparkleIcon,
} from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router';

/**
 * Represents one primary mobile bottom navigation item.
 */
type MobileNavItem = {
  href: string;
  label: string;
  key: string;
  icon: typeof HouseIcon;
};

/**
 * Represents one secondary menu item shown in the mobile More sheet.
 */
type MoreMenuItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof InfoIcon;
};

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    href: '/',
    label: 'Home',
    key: 'home',
    icon: HouseIcon,
  },
  {
    href: '/packages',
    label: 'Packages',
    key: 'packages',
    icon: PackageIcon,
  },
  {
    href: '/services',
    label: 'Services',
    key: 'services',
    icon: SparkleIcon,
  },
];

const MORE_MENU_ITEMS: MoreMenuItem[] = [
  {
    href: '/about',
    label: 'About',
    description: 'Learn more about Kafi Tours.',
    icon: InfoIcon,
  },
  {
    href: '/contact',
    label: 'Contact',
    description: 'Reach our travel coordination team.',
    icon: PhoneCallIcon,
  },
  {
    href: '/faq',
    label: 'FAQ',
    description: 'Answers for common travel questions.',
    icon: QuestionIcon,
  },
];

/**
 * Renders the mobile bottom navigation with a sidebar-style More sheet.
 *
 * @returns The mobile landing page bottom navigation.
 *
 * @remarks
 * - Primary items link to stable future routes such as `/packages` and `/services`.
 * - The More action opens a shadcn-style sheet using sidebar menu primitives.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-md border-t border-border/40 flex justify-around items-center py-2.5 px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-elevated">
      {MOBILE_NAV_ITEMS.map((item) => (
        <MobileBottomNavLink
          key={item.key}
          href={item.href}
          label={item.label}
          icon={item.icon}
          isActive={activePath === item.href}
        />
      ))}

      <Sheet>
        <SheetTrigger className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          <ListIcon weight="regular" className="w-5.5 h-5.5" />
          <span className="text-[9px] font-semibold mt-1">More</span>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-0 max-h-[85dvh] overflow-y-auto overscroll-y-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-5 py-4">
            <SheetTitle>More</SheetTitle>
            <SheetDescription>Quick access…</SheetDescription>
          </SheetHeader>
          <div className="px-3">
            <div className="space-y-3 px-3  flex justify-end">
              <ThemeToggle />
            </div>
            <div>
              {MORE_MENU_ITEMS.map((item) => (
                <div key={item.href}>
                  <SheetClose
                    render={
                      <Button
                        variant={'ghost'}
                        render={<Link to={item.href} />}
                        size="lg"
                        className="h-auto items-start gap-3 rounded-2xl px-3 py-3 border-none"
                      />
                    }
                  >
                    <item.icon className="mt-0.5 h-4 w-4 text-accent" />
                    <span className="grid gap-0.5">
                      <span className="font-medium text-sidebar-foreground">
                        {item.label}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </SheetClose>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

/**
 * Renders one mobile bottom navigation link.
 *
 * @param href - The route destination.
 * @param label - The visible navigation label.
 * @param icon - The icon component for the navigation item.
 * @param isActive - Whether the current route matches this item.
 * @returns A mobile bottom navigation anchor.
 */
function MobileBottomNavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: typeof HouseIcon;
  isActive: boolean;
}) {
  return (
    <Link
      to={href}
      className={`flex flex-col items-center justify-center transition-colors ${
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
      }`}
    >
      <Icon weight={isActive ? 'fill' : 'regular'} className="w-5.5 h-5.5" />
      <span className="text-[9px] font-semibold mt-1">{label}</span>
    </Link>
  );
}
