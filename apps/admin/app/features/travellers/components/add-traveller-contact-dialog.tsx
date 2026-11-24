import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';

import {
  api,
  type ContactPerson,
  type Country,
  type Language,
  type LookupOption,
} from '../../../lib/api.js';
import { ContactPersonDialog } from './contact-person-dialog';
import type { ContactPersonFormOutput } from '../types/travellers.types';

/**
 * One-step dialog for linking a contact person to a traveller.
 *
 * - Link an existing reusable contact person, or create a new one inline.
 * - Choose the relationship and mark primary/emergency in the same action —
 *   these flags drive registration-intake readiness.
 * - If the contact is already linked (409), the existing link is updated
 *   with the chosen flags instead of failing.
 */
export function AddTravellerContactDialog({
  travellerId,
  open,
  onOpenChange,
  onSaved,
}: {
  travellerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<LookupOption[]>(
    [],
  );
  const [contactStatuses, setContactStatuses] = useState<LookupOption[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [personStatuses, setPersonStatuses] = useState<LookupOption[]>([]);

  const [contactPersonId, setContactPersonId] = useState('');
  const [relationshipTypeId, setRelationshipTypeId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const [persons, rels, statuses, cs, lang, personStatus] =
          await Promise.all([
            api.listContactPersons(1, 100),
            api.listRelationshipTypes(),
            api.listTravellerContactStatuses(),
            api.listCountries(),
            api.listLanguages(),
            api.listContactPersonStatuses(),
          ]);
        if (cancelled) return;
        setContactPersons(persons.data);
        setRelationshipTypes(rels);
        setContactStatuses(statuses);
        setCountries(cs);
        setLanguages(lang);
        setPersonStatuses(personStatus);
      } catch {
        if (!cancelled) toast.error('Failed to load contact data');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const reset = useCallback(() => {
    setContactPersonId('');
    setRelationshipTypeId('');
    setIsPrimary(false);
    setIsEmergency(false);
    setCreateError(null);
    setCreateSuccess(null);
  }, []);

  async function handleCreatePerson(values: ContactPersonFormOutput) {
    setCreateError(null);
    try {
      const person = await api.createContactPerson(values);
      setContactPersons((prev) => [person, ...prev]);
      setContactPersonId(person.id);
      setCreateSuccess('Contact person created');
      setTimeout(() => {
        setCreateOpen(false);
        setCreateSuccess(null);
      }, 800);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create contact',
      );
    }
  }

  async function handleSave() {
    const activeStatus = contactStatuses.find(
      (s) => s.status_code?.toUpperCase() === 'ACTIVE',
    );
    if (!activeStatus) {
      toast.error('No active traveller contact status found');
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        contact_person_id: contactPersonId,
        relationship_type_id: relationshipTypeId,
        is_primary_contact: isPrimary,
        is_emergency_contact: isEmergency,
        traveller_contact_status_id: activeStatus.id,
      };
      try {
        await api.createTravellerContact(travellerId, input);
      } catch (err) {
        // 409 Conflict means already linked — repair flags on the
        // existing link instead of failing.
        const status = (err as { status?: number }).status;
        if (status !== 409) throw err;
        const existing = await api.listTravellerContacts(travellerId);
        const link = existing.find(
          (c) => c.contact_person?.id === contactPersonId,
        );
        if (!link) {
          toast.error(
            'This contact is already linked and could not be updated.',
          );
          return;
        }
        await api.updateTravellerContact(travellerId, link.id, {
          relationship_type_id: relationshipTypeId || undefined,
          is_primary_contact: isPrimary,
          is_emergency_contact: isEmergency,
          traveller_contact_status_id: activeStatus.id,
        });
      }
      toast.success('Contact linked');
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to link contact',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canSave = !!contactPersonId && !!relationshipTypeId && !submitting;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) reset();
          onOpenChange(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Link a contact person to this traveller, or create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Contact person <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={contactPersonId}
                  onValueChange={(v) => setContactPersonId(v ?? '')}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue>
                      {contactPersons.find((p) => p.id === contactPersonId)
                        ? `${
                            contactPersons.find(
                              (p) => p.id === contactPersonId,
                            )!.first_name
                          } ${
                            contactPersons.find(
                              (p) => p.id === contactPersonId,
                            )!.last_name
                          }`
                        : 'Select contact person'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {contactPersons.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                        {p.phone_number ? ` — ${p.phone_number}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  New person
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Relationship <span className="text-destructive">*</span>
              </Label>
              <Select
                value={relationshipTypeId}
                onValueChange={(v) => setRelationshipTypeId(v ?? '')}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue>
                    {relationshipTypes.find((r) => r.id === relationshipTypeId)
                      ?.name ?? 'Select relationship'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={isPrimary}
                  onCheckedChange={(v) => setIsPrimary(v === true)}
                />
                Primary contact
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={isEmergency}
                  onCheckedChange={(v) => setIsEmergency(v === true)}
                />
                Emergency contact
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
            >
              Link contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactPersonDialog
        mode="create"
        countries={countries}
        languages={languages}
        statuses={personStatuses}
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) {
            setCreateError(null);
            setCreateSuccess(null);
          }
        }}
        onSubmit={handleCreatePerson}
        error={createError}
        success={createSuccess}
      />
    </>
  );
}
