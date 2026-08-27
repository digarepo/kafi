import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@kafi/ui';

export type WorkflowCommand =
  | 'start-processing'
  | 'confirm-ready'
  | 'confirm-travel-prepared'
  | 'depart'
  | 'complete'
  | 'cancel-registration';

interface WorkflowCommandPresentation {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  requiresReason?: boolean;
}

export const workflowCommandPresentation: Record<
  WorkflowCommand,
  WorkflowCommandPresentation
> = {
  'start-processing': {
    title: 'Start processing',
    description: 'Start processing this registration?',
    confirmLabel: 'Start processing',
  },
  'confirm-ready': {
    title: 'Confirm ready for travel',
    description: 'Confirm that this registration is ready for travel?',
    confirmLabel: 'Confirm ready',
  },
  'confirm-travel-prepared': {
    title: 'Confirm travel prepared',
    description: 'Confirm that this travel group is prepared for travel?',
    confirmLabel: 'Confirm prepared',
  },
  depart: {
    title: 'Depart travel group',
    description: 'Record this travel group as departed?',
    confirmLabel: 'Depart',
  },
  complete: {
    title: 'Complete travel group',
    description: 'Complete this travel group and its active registrations?',
    confirmLabel: 'Complete',
  },
  'cancel-registration': {
    title: 'Cancel registration',
    description: 'Cancel this registration? A reason is required.',
    confirmLabel: 'Cancel registration',
    destructive: true,
    requiresReason: true,
  },
};

interface WorkflowConfirmationDialogProps {
  command: WorkflowCommand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function WorkflowConfirmationDialog({
  command,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  error,
}: WorkflowConfirmationDialogProps) {
  const [reason, setReason] = useState('');
  const presentation = command ? workflowCommandPresentation[command] : null;
  const requiresReason = presentation?.requiresReason ?? false;

  useEffect(() => {
    if (!open) setReason('');
  }, [open, command]);

  if (!presentation) return null;

  const handleConfirm = () => {
    void onConfirm(requiresReason ? reason.trim() : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{presentation.title}</DialogTitle>
          <DialogDescription>{presentation.description}</DialogDescription>
        </DialogHeader>

        {requiresReason && (
          <div className="space-y-2">
            <Label htmlFor="workflow-cancellation-reason">
              Cancellation reason
            </Label>
            <Textarea
              id="workflow-cancellation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter the reason for cancellation"
              disabled={loading}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Keep open
          </Button>
          <Button
            variant={presentation.destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading || (requiresReason && reason.trim().length === 0)}
          >
            {loading ? 'Working…' : presentation.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
