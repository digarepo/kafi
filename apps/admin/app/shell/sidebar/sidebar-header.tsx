import { Link } from 'react-router';
import {
  cn,
  SidebarHeader as ShadcnSidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@kafi/ui';

function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <img
        src="/KafiOr.svg"
        alt="Kafi Tours"
        className="absolute inset-0 h-full w-full object-contain dark:hidden"
      />
      <img
        src="/KafiDef.svg"
        alt="Kafi Tours"
        className="absolute inset-0 hidden h-full w-full object-contain dark:block"
      />
    </div>
  );
}

export function SidebarHeader() {
  const { isMobile, state } = useSidebar();
  const isExpanded = isMobile || state === 'expanded';

  return (
    <ShadcnSidebarHeader className={cn('h-14', !isExpanded && 'p-0')}>
      {isExpanded ? (
        <div className="flex h-full items-center justify-between px-3">
          <Link
            to="/"
            className="flex items-center gap-2 outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo className="h-10 w-10 shrink-0" />
            <h1 className="font-semibold tracking-wide text-accent">
              <span className="text-primary">KAFI</span> TOURS
            </h1>
          </Link>
          <SidebarTrigger className="h-8 w-8" />
        </div>
      ) : (
        <div className="group/sidebar-brand relative flex h-full items-center justify-center px-1">
          <Link
            to="/"
            aria-label="Kafi Tours home"
            className="flex h-10 w-10 items-center justify-center rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo className="h-10 w-10 shrink-0" />
          </Link>
          <SidebarTrigger
            aria-label="Expand sidebar"
            className="pointer-events-none absolute inset-1 h-auto w-auto bg-sidebar/80 opacity-0 transition-opacity group-hover/sidebar-brand:pointer-events-auto group-hover/sidebar-brand:opacity-100 group-focus-within/sidebar-brand:pointer-events-auto group-focus-within/sidebar-brand:opacity-100"
          />
        </div>
      )}
    </ShadcnSidebarHeader>
  );
}
