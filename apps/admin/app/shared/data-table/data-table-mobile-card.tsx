import { useState, type ReactNode } from 'react';
import { CaretDownIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { cn } from '@kafi/ui';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kafi/ui';

/**
 * Props for a compact mobile list item that expands to show full row details.
 */
export interface DataTableMobileCardProps {
  /** Primary label — usually the row name or title. */
  title: ReactNode;

  /** Secondary line shown under the title, e.g. an email or code. */
  subtitle?: ReactNode;

  /** Small decorative content shown next to the title, e.g. status badges. */
  meta?: ReactNode;

  /** Optional action menu rendered as a vertical-dots button. */
  actions?: ReactNode;

  /** Expanded details for the row. */
  children?: ReactNode;
}

/**
 * A single mobile row that looks like a card item and expands like an
 * accordion. No extra borders or wrappers are added, so it sits cleanly
 * inside a full-width list.
 */
export function DataTableMobileCard({
  title,
  subtitle,
  meta,
  actions,
  children,
}: DataTableMobileCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group">
      <div className="flex items-start">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate font-medium">{title}</div>
              {meta}
            </div>
            {subtitle && (
              <div className="truncate text-sm text-muted-foreground">
                {subtitle}
              </div>
            )}
          </div>

          <CaretDownIcon
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {actions && (
          <div
            className="flex items-start py-4 pr-4"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 text-sm text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Action item descriptor for the mobile overflow menu.
 */
export interface DataTableMobileAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

/**
 * A vertical-dots overflow menu for mobile list items.
 */
export function DataTableMobileActions({
  items,
}: {
  items: DataTableMobileAction[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <DotsThreeVerticalIcon className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={item.onClick}
            variant={item.destructive ? 'destructive' : 'default'}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
