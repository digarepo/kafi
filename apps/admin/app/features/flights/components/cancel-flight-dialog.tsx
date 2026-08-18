import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@kafi/ui';

import type { CancelFlightDialogProps } from '../types/flights.types';

export function CancelFlightDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CancelFlightDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Cancellation reason is required');
      return;
    }
    setError(null);
    try {
      await onSubmit(reason.trim());
      setReason('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel flight booking</DialogTitle>
          <DialogDescription>
            The booking will transition from CONFIRMED to CANCELLED. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="Reason for cancellation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!error}
            className="w-full"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleSubmit()}
              disabled={loading}
            >
              {loading ? 'Cancelling...' : 'Cancel booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
