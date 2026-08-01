import { Link } from 'react-router';
import { cn } from '@kafi/ui';
import {
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

/**
 * Sidebar header.
 *
 * Expanded: branded logo left, shadcn SidebarTrigger right.
 * Collapsed: shadcn SidebarTrigger centered.
 */
export function SidebarHeader() {
  const { state } = useSidebar();

  return (
    <ShadcnSidebarHeader className={cn('h-14', state === 'collapsed' && 'p-0')}>
      {state === 'expanded' ? (
        <div className="flex h-full items-center justify-between px-3">
          <Link
            to="/"
            className="flex items-center gap-2 outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo className="h-10 w-10 shrink-0" />
            <h1 className="font-semibold text-accent tracking-wide">
              <span className="text-primary">KAFI</span> TOURS
            </h1>
          </Link>

          <SidebarTrigger className="h-8 w-8" />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center px-1">
          <div className="group relative flex h-10 w-10 shrink-0 items-center justify-center">
            <BrandLogo className="absolute inset-0 h-full w-full transition-opacity group-hover:opacity-0" />
            <SidebarTrigger className="absolute inset-0 m-auto hidden h-10 w-10 group-hover:flex" />
          </div>
        </div>
      )}
    </ShadcnSidebarHeader>
  );
}
