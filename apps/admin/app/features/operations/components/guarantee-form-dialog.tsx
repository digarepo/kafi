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
  SelectValue,
  Textarea,
} from '@kafi/ui';
import {
  api,
  type ContactPerson,
  type Currency,
  type Guarantee,
  type GroupMembership,
} from '../../../lib/api.js';
import { DatePicker } from '../../travellers/components/date-picker';

const GUARANTEE_TYPES = [
  { code: 'PERSON', name: 'Person' },
  { code: 'CASH_DEPOSIT', name: 'Cash deposit' },
  { code: 'CPO', name: 'CPO' },
  { code: 'BANK_GUARANTEE', name: 'Bank guarantee' },
] as const;

type GuaranteeType = (typeof GUARANTEE_TYPES)[number]['code'];

interface GuaranteeFormDialogProps {
  mode: 'create' | 'replace';
  membership: GroupMembership;
  guarantee?: Guarantee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function GuaranteeFormDialog({
  mode,
  membership,
  guarantee,
  open,
  onOpenChange,
  onSaved,
}: GuaranteeFormDialogProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<GuaranteeType>('PERSON');
  const [contactId, setContactId] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [effective, setEffective] = useState('');
  const [expiry, setExpiry] = useState('');
  const [issuer, setIssuer] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [cur, con] = await Promise.all([
          api.listCurrencies(),
          api.listContactPersons(1, 100),
        ]);
        if (!cancelled) {
          setCurrencies(cur);
          setContacts(con.data);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load reference data',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (mode === 'replace' && guarantee) {
      setType(guarantee.guarantee_type as GuaranteeType);
      setContactId(guarantee.contact_person_id ?? '');
      setReference(guarantee.instrument_reference ?? '');
      setAmount(guarantee.amount?.toString() ?? '');
      setCurrencyId(guarantee.currency_id ?? '');
      setEffective(guarantee.effective_date ?? '');
      setExpiry(guarantee.expiry_date ?? '');
      setIssuer(guarantee.issuer ?? '');
      setNotes(guarantee.notes ?? '');
    } else {
      setType('PERSON');
      setContactId('');
      setReference('');
      setAmount('');
      setCurrencyId('');
      setEffective('');
      setExpiry('');
      setIssuer('');
      setNotes('');
    }
  }, [mode, guarantee, open]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        guarantee_type: type,
        contact_person_id:
          type === 'PERSON' ? contactId || undefined : undefined,
        instrument_reference: reference.trim() || undefined,
        amount: amount ? Number(amount) : undefined,
        currency_id: amount ? currencyId || undefined : undefined,
        effective_date: effective || undefined,
        expiry_date: expiry || undefined,
        issuer: issuer.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (mode === 'replace' && guarantee) {
        await api.replaceGuarantee(guarantee.id, payload);
      } else {
        await api.createGuarantee(membership.id, {
          group_membership_id: membership.id,
          registration_id: membership.registration_id,
          ...payload,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guarantee');
    } finally {
      setSaving(false);
    }
  }

  const amountRequired = type !== 'PERSON';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'replace' ? 'Replace guarantee' : 'Add guarantee'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'replace'
              ? 'Create a new guarantee that replaces the selected one.'
              : 'Record a guarantee instrument for this membership.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Guarantee type — full width */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm font-medium">
              Guarantee type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={type ?? ''}
              onValueChange={(v) =>
                setType(((v ?? '') || 'PERSON') as GuaranteeType)
              }
              disabled={loading}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {GUARANTEE_TYPES.map((t) => ({
                    value: t.code,
                    label: t.name,
                  })).find((o) => o.value === type)?.label ??
                    'Select guarantee type'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GUARANTEE_TYPES.map((t) => ({
                  value: t.code,
                  label: t.name,
                })).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact person — full width, only for PERSON type */}
          {type === 'PERSON' && (
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">
                Contact person <span className="text-destructive">*</span>
              </Label>
              <Select
                value={contactId ?? ''}
                onValueChange={(v) => setContactId(v ?? '')}
                disabled={loading}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue>
                    {contacts
                      .map((c) => ({
                        value: c.id,
                        label: `${c.first_name} ${c.last_name}`,
                      }))
                      .find((o) => o.value === contactId)?.label ??
                      'Select contact person'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contacts
                    .map((c) => ({
                      value: c.id,
                      label: `${c.first_name} ${c.last_name}`,
                    }))
                    .map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Instrument reference */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reference number</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={loading}
              className="h-9 w-full"
            />
          </div>

          {/* Issuer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Issuer</Label>
            <Input
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              disabled={loading}
              className="h-9 w-full"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Amount{' '}
              {amountRequired && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="h-9 w-full"
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Currency{' '}
              {amountRequired && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={currencyId ?? ''}
              onValueChange={(v) => setCurrencyId(v ?? '')}
              disabled={loading}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {currencies
                    .map((c) => ({
                      value: c.id,
                      label: `${c.currency_code} · ${c.name}`,
                    }))
                    .find((o) => o.value === currencyId)?.label ??
                    'Select currency'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {currencies
                  .map((c) => ({
                    value: c.id,
                    label: `${c.currency_code} · ${c.name}`,
                  }))
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Effective date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Effective date</Label>
            <DatePicker
              value={effective}
              onChange={setEffective}
              placeholder="Select date"
              disabled={loading}
            />
          </div>

          {/* Expiry date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Expiry date</Label>
            <DatePicker
              value={expiry}
              onChange={setExpiry}
              placeholder="Select date"
              disabled={loading}
            />
          </div>

          {/* Notes — full width */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              saving ||
              (type === 'PERSON' && !contactId) ||
              (amountRequired && !amount)
            }
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
