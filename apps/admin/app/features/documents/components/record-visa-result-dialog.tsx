/**
 * Record Visa Result dialog.
 *
 * @remarks
 * - Presents an outcome selector (Approved / Rejected / Cancelled).
 * - Dynamically shows only the fields required for the selected outcome.
 * - Mobile-first: dialog content uses responsive grid that collapses to
 *   single column on small screens.
 * - Uses the existing Kafi admin design system (Dialog, Select, DatePicker).
 */

import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Textarea,
} from '@kafi/ui';

import { DatePicker } from './date-picker';
import type {
  VisaResultDialogProps,
  VisaResultFormValues,
} from '../types/documents.types';

const emptyValues: VisaResultFormValues = {
  outcome: '',
  visa_number: '',
  approval_date: '',
  expiry_date: '',
  visa_cost: '',
  rejection_date: '',
  rejection_reason: '',
  cancellation_date: '',
  cancellation_reason: '',
};

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function RecordVisaResultDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  currentVisaCost,
}: VisaResultDialogProps) {
  const [values, setValues] = useState<VisaResultFormValues>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setValues(emptyValues);
      setErrors({});
    } else if (currentVisaCost != null && currentVisaCost > 0) {
      setValues((prev) => ({
        ...prev,
        visa_cost: String(currentVisaCost),
      }));
    }
  }, [open, currentVisaCost]);

  function update<K extends keyof VisaResultFormValues>(
    key: K,
    value: VisaResultFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!values.outcome) {
      next.outcome = 'Please select an outcome';
    } else if (values.outcome === 'APPROVED') {
      if (!values.visa_number.trim())
        next.visa_number = 'Visa number is required';
      if (!values.approval_date.trim())
        next.approval_date = 'Approval date is required';
      if (!values.expiry_date.trim())
        next.expiry_date = 'Expiry date is required';
      const cost = Number(values.visa_cost);
      if (!values.visa_cost.trim() || isNaN(cost) || cost <= 0)
        next.visa_cost = 'Visa cost must be a positive amount in ETB';
    } else if (values.outcome === 'REJECTED') {
      if (!values.rejection_date.trim())
        next.rejection_date = 'Rejection date is required';
      if (!values.rejection_reason.trim())
        next.rejection_reason = 'Rejection reason is required';
    } else if (values.outcome === 'CANCELLED') {
      if (!values.cancellation_date.trim())
        next.cancellation_date = 'Cancellation date is required';
      if (!values.cancellation_reason.trim())
        next.cancellation_reason = 'Cancellation reason is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleConfirm() {
    if (!validate()) return;
    await onSubmit(values);
  }

  const isApproved = values.outcome === 'APPROVED';
  const isRejected = values.outcome === 'REJECTED';
  const isCancelled = values.outcome === 'CANCELLED';
  const isDestructive = isRejected || isCancelled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record visa result</DialogTitle>
          <DialogDescription>
            Select the visa decision outcome and provide the required details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outcome selector */}
          <div className="space-y-2">
            <Label htmlFor="visa-outcome" className="text-sm font-medium">
              Outcome
            </Label>
            <Select
              value={values.outcome}
              onValueChange={(v) => {
                update('outcome', v ?? '');
                // Pre-fill dates to today when outcome is selected
                if (v === 'APPROVED') {
                  setValues((prev) => ({
                    ...prev,
                    outcome: v,
                    approval_date: prev.approval_date || todayISO(),
                  }));
                } else if (v === 'REJECTED') {
                  setValues((prev) => ({
                    ...prev,
                    outcome: v,
                    rejection_date: prev.rejection_date || todayISO(),
                  }));
                } else if (v === 'CANCELLED') {
                  setValues((prev) => ({
                    ...prev,
                    outcome: v,
                    cancellation_date: prev.cancellation_date || todayISO(),
                  }));
                }
              }}
            >
              <SelectTrigger
                id="visa-outcome"
                className="h-9 w-full"
                aria-invalid={!!errors.outcome}
              >
                {values.outcome
                  ? values.outcome.charAt(0) +
                    values.outcome.slice(1).toLowerCase()
                  : 'Select outcome'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {errors.outcome && (
              <p className="text-sm text-destructive">{errors.outcome}</p>
            )}
          </div>

          {/* APPROVED fields */}
          {isApproved && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visa-number" className="text-sm font-medium">
                  Visa number
                </Label>
                <Input
                  id="visa-number"
                  value={values.visa_number}
                  onChange={(e) => update('visa_number', e.target.value)}
                  placeholder="Enter visa number"
                  aria-invalid={!!errors.visa_number}
                  className="h-9 w-full"
                  disabled={loading}
                />
                {errors.visa_number && (
                  <p className="text-sm text-destructive">
                    {errors.visa_number}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="approval-date"
                    className="text-sm font-medium"
                  >
                    Approval date
                  </Label>
                  <DatePicker
                    id="approval-date"
                    value={values.approval_date}
                    onChange={(v) => update('approval_date', v)}
                    aria-invalid={!!errors.approval_date}
                    placeholder="Select approval date"
                  />
                  {errors.approval_date && (
                    <p className="text-sm text-destructive">
                      {errors.approval_date}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry-date" className="text-sm font-medium">
                    Expiry date
                  </Label>
                  <DatePicker
                    id="expiry-date"
                    value={values.expiry_date}
                    onChange={(v) => update('expiry_date', v)}
                    aria-invalid={!!errors.expiry_date}
                    placeholder="Select expiry date"
                  />
                  {errors.expiry_date && (
                    <p className="text-sm text-destructive">
                      {errors.expiry_date}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visa-cost" className="text-sm font-medium">
                  Visa cost <span className="text-muted-foreground">(ETB)</span>
                </Label>
                <Input
                  id="visa-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.visa_cost}
                  onChange={(e) => update('visa_cost', e.target.value)}
                  placeholder="e.g. 1500"
                  aria-invalid={!!errors.visa_cost}
                  className="h-9 w-full sm:max-w-xs"
                  disabled={loading}
                />
                {errors.visa_cost ? (
                  <p className="text-sm text-destructive">{errors.visa_cost}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    A Finance expense will be created automatically for this
                    amount.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* REJECTED fields */}
          {isRejected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-date" className="text-sm font-medium">
                  Rejection date
                </Label>
                <DatePicker
                  id="rejection-date"
                  value={values.rejection_date}
                  onChange={(v) => update('rejection_date', v)}
                  aria-invalid={!!errors.rejection_date}
                  placeholder="Select rejection date"
                />
                {errors.rejection_date && (
                  <p className="text-sm text-destructive">
                    {errors.rejection_date}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="rejection-reason"
                  className="text-sm font-medium"
                >
                  Rejection reason
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={values.rejection_reason}
                  onChange={(e) => update('rejection_reason', e.target.value)}
                  placeholder="Enter the reason for rejection"
                  aria-invalid={!!errors.rejection_reason}
                  className="w-full"
                  disabled={loading}
                />
                {errors.rejection_reason && (
                  <p className="text-sm text-destructive">
                    {errors.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CANCELLED fields */}
          {isCancelled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="cancellation-date"
                  className="text-sm font-medium"
                >
                  Cancellation date
                </Label>
                <DatePicker
                  id="cancellation-date"
                  value={values.cancellation_date}
                  onChange={(v) => update('cancellation_date', v)}
                  aria-invalid={!!errors.cancellation_date}
                  placeholder="Select cancellation date"
                />
                {errors.cancellation_date && (
                  <p className="text-sm text-destructive">
                    {errors.cancellation_date}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="cancellation-reason"
                  className="text-sm font-medium"
                >
                  Cancellation reason
                </Label>
                <Textarea
                  id="cancellation-reason"
                  value={values.cancellation_reason}
                  onChange={(e) =>
                    update('cancellation_reason', e.target.value)
                  }
                  placeholder="Enter the reason for cancellation"
                  aria-invalid={!!errors.cancellation_reason}
                  className="w-full"
                  disabled={loading}
                />
                {errors.cancellation_reason && (
                  <p className="text-sm text-destructive">
                    {errors.cancellation_reason}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={() => void handleConfirm()}
            disabled={loading || !values.outcome}
            className="w-full sm:w-auto"
          >
            {loading ? 'Recording…' : 'Record result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
