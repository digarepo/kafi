import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { TrashIcon } from '@phosphor-icons/react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kafi/ui';

export interface DeleteDialogProps {
  /** Controlled open state. */
  open?: boolean;

  /** Controlled open state callback. */
  onOpenChange?: (open: boolean) => void;

  /**
   * Element that opens the dialog. It will receive the trigger props from
   * base-ui, so it can be a button, menu item, or icon button.
   */
  trigger?: ReactElement;

  /** Override the default dialog title. */
  title?: ReactNode;

  /** Override the default confirmation description. */
  description?: ReactNode;

  /** Type of entity being deleted, e.g. "user" or "role". */
  itemName?: string;

  /** The specific display name of the item, e.g. a user's full name. */
  name?: string;

  /** Called when the user confirms deletion. */
  onConfirm: () => void | Promise<void>;

  /** Whether the confirm action is in flight. */
  loading?: boolean;

  /** Custom confirm button label. */
  confirmLabel?: string;

  /** Custom cancel button label. */
  cancelLabel?: string;
}

export interface DestructiveConfirmationOptions {
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
}

type DestructiveConfirmationContextValue = {
  confirm: (options: DestructiveConfirmationOptions) => Promise<boolean>;
};

const DestructiveConfirmationContext =
  createContext<DestructiveConfirmationContextValue | null>(null);

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Reusable destructive confirmation dialog.
 *
 * Provides sensible defaults for delete flows and can be controlled or
 * uncontrolled depending on the parent.
 */
export function DeleteDialog({
  open: controlledOpen,
  onOpenChange,
  trigger,
  title,
  description,
  itemName = 'item',
  name,
  onConfirm,
  loading = false,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
}: DeleteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;

  const handleOpenChange = useCallback(
    (value: boolean) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );

  const defaultTitle = `Delete ${capitalize(itemName)}`;
  const defaultDescription = `Are you sure you want to delete ${name ? `"${name}"` : `this ${itemName}`}? This action cannot be undone.`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}

      <DialogContent>
        <DialogHeader>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <TrashIcon className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-2">
            <DialogTitle>{title ?? defaultTitle}</DialogTitle>
            <DialogDescription>
              {description ?? defaultDescription}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for controlling a delete dialog from parent state.
 */
export function useDeleteDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function DeleteDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{
    options: DestructiveConfirmationOptions;
    resolve: (confirmed: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: DestructiveConfirmationOptions) =>
      new Promise<boolean>((resolve) => setRequest({ options, resolve })),
    [],
  );

  const close = useCallback(() => {
    setRequest((current) => {
      current?.resolve(false);
      return null;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setRequest((current) => {
      current?.resolve(true);
      return null;
    });
  }, []);

  return (
    <DestructiveConfirmationContext.Provider value={{ confirm }}>
      {children}
      <DeleteDialog
        open={request !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={request?.options.title}
        description={request?.options.description}
        confirmLabel={request?.options.confirmLabel}
        onConfirm={handleConfirm}
      />
    </DestructiveConfirmationContext.Provider>
  );
}

export function useDestructiveConfirmation() {
  const context = useContext(DestructiveConfirmationContext);
  if (!context) {
    throw new Error(
      'useDestructiveConfirmation must be used within DeleteDialogProvider.',
    );
  }
  return context;
}
