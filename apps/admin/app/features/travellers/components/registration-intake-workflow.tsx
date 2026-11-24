/**
 * Guided registration intake workflow.
 *
 * Walks staff through the complete registration intake process:
 *   1. Traveler selection
 *   2. Emergency contact
 *   3. Guarantee
 *   4. Finance / payment
 *   5. Review
 *   6. Complete registration
 *
 * The workflow creates the registration on step 1, then progressively
 * attaches intake requirements. When all conditions are satisfied the
 * system transitions the registration from DRAFT to PROCESSING.
 *
 * Traveller documents (passport, photo) are managed on the traveller
 * profile — they are checked at the review step, not collected here.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from '@kafi/ui';

import { api, ApiError } from '../../../lib/api.js';
import { usePermissions } from '../../../core/permissions';
import {
  documentsApi,
  type DocumentListItem,
  type DocumentType,
} from '../../documents/lib/api.js';
import { ContactPersonDialog } from './contact-person-dialog';
import { CreditExceptionRequestDialog } from '../../finance/components/credit-exception-request-dialog';
import { FormProgress } from '../../../shared/form-progress';
import { formatBlockers } from '../../../shared/blocker-labels';
import { RegistrationForm } from './registration-form';
import { DatePicker } from './date-picker';
import type {
  ContactPerson,
  Country,
  CreditExceptionRequestListItem,
  FinanceExceptionListItem,
  Guarantee,
  Language,
  LookupOption,
  PackageVersion,
  Registration,
  RegistrationOperationalSummary,
  Traveller,
  TravelRound,
} from '../../../lib/api.js';

const WORKFLOW_STEPS = [
  { key: 'traveler', label: 'Traveler' },
  { key: 'contact', label: 'Emergency Contact' },
  { key: 'guarantee', label: 'Guarantee' },
  { key: 'finance', label: 'Payment' },
  { key: 'review', label: 'Review' },
] as const;

const GUARANTEE_TYPES: Array<{
  value: Guarantee['guarantee_type'];
  label: string;
}> = [
  { value: 'PERSON', label: 'Person' },
  { value: 'CPO', label: 'CPO' },
  { value: 'CASH_DEPOSIT', label: 'Cash Deposit' },
  { value: 'BANK_GUARANTEE', label: 'Bank Guarantee' },
  { value: 'OTHER', label: 'Other' },
];

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RegistrationIntakeWorkflow({
  packageVersions,
  travelRounds,
  registrationId,
}: {
  packageVersions: PackageVersion[];
  travelRounds: TravelRound[];
  registrationId?: string;
}) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resuming, setResuming] = useState(!!registrationId);

  // Reference data
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [contactStatuses, setContactStatuses] = useState<LookupOption[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<LookupOption[]>(
    [],
  );
  const [travellerContactStatuses, setTravellerContactStatuses] = useState<
    LookupOption[]
  >([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [currencies, setCurrencies] = useState<LookupOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ id: string; name: string; method_code: string }>
  >([]);
  const [payerTypes, setPayerTypes] = useState<LookupOption[]>([]);

  // Step 1: Traveler + package selection
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [selectedTravellerId, setSelectedTravellerId] = useState('');
  const [selectedPackageVersionId, setSelectedPackageVersionId] = useState('');
  const [selectedTravelRoundId, setSelectedTravelRoundId] = useState('');
  const [expectedDepartureDate, setExpectedDepartureDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [registration, setRegistration] = useState<Registration | null>(null);

  // Traveller documents (managed on the traveller profile — tracked here
  // only for the review-step readiness checklist)
  const [travellerDocuments, setTravellerDocuments] = useState<
    DocumentListItem[]
  >([]);

  // Step 3: Emergency contact
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactDialogError, setContactDialogError] = useState<string | null>(
    null,
  );
  const [contactDialogSuccess, setContactDialogSuccess] = useState<
    string | null
  >(null);
  const [linkedContactId, setLinkedContactId] = useState<string | null>(null);

  // Step 4: Guarantee
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [guaranteeType, setGuaranteeType] =
    useState<Guarantee['guarantee_type']>('PERSON');
  const [guaranteeContactId, setGuaranteeContactId] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState('');
  const [guaranteeCurrencyId, setGuaranteeCurrencyId] = useState('');
  const [guaranteeReference, setGuaranteeReference] = useState('');
  const [guaranteeExpiry, setGuaranteeExpiry] = useState('');
  const [guaranteeIssuer, setGuaranteeIssuer] = useState('');
  const [guaranteeNotes, setGuaranteeNotes] = useState('');
  const [guaranteeEditing, setGuaranteeEditing] = useState(false);
  const [registrationDiscountType, setRegistrationDiscountType] = useState<
    'FIXED' | 'PERCENT'
  >('FIXED');
  const [registrationDiscountValue, setRegistrationDiscountValue] =
    useState('0');
  const [financeFormOpen, setFinanceFormOpen] = useState(false);
  // Step 5: Finance
  const [financeSummary, setFinanceSummary] = useState<{
    total_invoiced: number;
    total_paid: number;
    outstanding_balance: number;
    total_unallocated: number;
  } | null>(null);
  const [payerId, setPayerId] = useState('');
  const [payers, setPayers] = useState<
    Array<{ id: string; payer_number: string; contact_name: string | null }>
  >([]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  // Invoice subtotal input — empty means "use the full package price".
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [showCustomPayerForm, setShowCustomPayerForm] = useState(false);
  const [customPayerName, setCustomPayerName] = useState('');
  const [customPayerPhone, setCustomPayerPhone] = useState('');
  const [activeException, setActiveException] =
    useState<FinanceExceptionListItem | null>(null);
  const [pendingRequest, setPendingRequest] =
    useState<CreditExceptionRequestListItem | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  // Step 6-7: Review & complete
  const [operationalSummary, setOperationalSummary] =
    useState<RegistrationOperationalSummary | null>(null);

  const selectedTraveller = travellers.find(
    (t) => t.id === selectedTravellerId,
  );
  const selectedPackage = packageVersions.find(
    (p) => p.id === selectedPackageVersionId,
  );

  // ---- Load reference data ----
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [
          countriesRes,
          languagesRes,
          contactStatusesRes,
          relationshipTypesRes,
          travellerContactStatusesRes,
          documentTypesRes,
          currenciesRes,
          paymentMethodsRes,
          payerTypesRes,
        ] = await Promise.all([
          api.listCountries(),
          api.listLanguages(),
          api.listContactPersonStatuses(),
          api.listRelationshipTypes(),
          api.listTravellerContactStatuses(),
          documentsApi.listDocumentTypes(),
          api.listCurrencies(),
          api.listPaymentMethods(),
          api.listPayerTypes(),
        ]);
        setCountries(countriesRes);
        setLanguages(languagesRes);
        setContactStatuses(contactStatusesRes);
        setRelationshipTypes(relationshipTypesRes);
        setTravellerContactStatuses(travellerContactStatusesRes);
        setDocumentTypes(documentTypesRes);
        setCurrencies(
          currenciesRes.map((c) => ({ id: c.id, name: c.currency_code })),
        );
        setPaymentMethods(paymentMethodsRes);
        setPayerTypes(payerTypesRes);
      } catch {
        // Non-fatal — individual steps will show their own errors
      }
    }
    void loadReferenceData();
  }, []);

  // ---- Resume an existing draft registration ----
  useEffect(() => {
    if (!registrationId) return;
    let cancelled = false;
    async function resumeRegistration() {
      try {
        const reg = await api.getRegistration(registrationId!);
        if (cancelled) return;
        setRegistration(reg);
        setSelectedTravellerId(reg.traveller?.id ?? '');
        setSelectedPackageVersionId(reg.package_version?.id ?? '');
        setExpectedDepartureDate(
          reg.expected_departure_date?.slice(0, 10) ?? '',
        );
        setExpectedReturnDate(reg.expected_return_date?.slice(0, 10) ?? '');
        setRemarks(reg.remarks ?? '');

        // Load intake data (documents, guarantees, finance, contacts)
        let linkedContact: string | null = null;
        let hasGuar = false;
        let outstandingBalance = 0;
        let invoiceCount = 0;

        const travellerId = reg.traveller?.id;
        if (travellerId) {
          try {
            const docs = await documentsApi.listTravellerDocuments(
              travellerId,
              1,
              100,
            );
            if (!cancelled) {
              setTravellerDocuments(docs.data);
            }
          } catch {
            // ignore
          }
          // Load existing traveller contacts to restore linked contact.
          // Only a primary + ACTIVE contact satisfies the readiness gate —
          // anything else must be re-linked so the flags get repaired.
          try {
            const [contacts, contactStatuses] = await Promise.all([
              api.listTravellerContacts(travellerId),
              api.listTravellerContactStatuses(),
            ]);
            if (!cancelled) {
              const activeStatusId = contactStatuses.find(
                (s) => s.status_code?.toUpperCase() === 'ACTIVE',
              )?.id;
              const satisfied = contacts.find(
                (c) =>
                  c.is_primary_contact &&
                  (!activeStatusId || c.status?.id === activeStatusId),
              );
              if (satisfied) {
                linkedContact = satisfied.contact_person?.id ?? null;
                setLinkedContactId(linkedContact);
                setSelectedContactId(linkedContact ?? '');
              } else {
                // A contact exists but doesn't satisfy readiness — preselect
                // it so the Next action re-links and sets primary/emergency.
                const fallback =
                  contacts.find(
                    (c) => c.is_primary_contact || c.is_emergency_contact,
                  ) ?? contacts[0];
                if (fallback) {
                  setSelectedContactId(fallback.contact_person?.id ?? '');
                }
              }
            }
          } catch {
            // ignore
          }
        }
        try {
          const guaranteesResult = await api.listRegistrationGuarantees(
            registrationId!,
          );
          if (!cancelled) {
            setGuarantees(guaranteesResult);
            hasGuar = guaranteesResult.some(
              (g) => g.guarantee_status === 'ACTIVE',
            );
          }
        } catch {
          // ignore
        }
        try {
          const financeRes = await api.getRegistrationFinanceSummary(
            registrationId!,
          );
          if (!cancelled) {
            setFinanceSummary(financeRes);
            outstandingBalance = financeRes.outstanding_balance;
          }
        } catch {
          // ignore
        }

        // Determine which step to jump to based on actual intake data
        // (not readiness, which requires verification)
        let summary: Awaited<
          ReturnType<typeof api.getRegistrationOperationalSummary>
        > | null = null;
        try {
          summary = await api.getRegistrationOperationalSummary(
            registrationId!,
          );
          if (cancelled) return;
          setOperationalSummary(summary);
          invoiceCount = summary.invoices?.length ?? 0;
        } catch {
          // ignore
        }

        const hasContact = !!linkedContact;
        const hasFin = invoiceCount > 0 && outstandingBalance <= 0;

        if (!reg.traveller?.id || !reg.package_version?.id) {
          setStepIndex(0);
        } else if (!hasContact) {
          setStepIndex(1);
        } else if (!hasGuar) {
          setStepIndex(2);
        } else if (!hasFin) {
          setStepIndex(3);
        } else {
          setStepIndex(4);
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Failed to load registration for resume',
        );
      } finally {
        if (!cancelled) setResuming(false);
      }
    }
    void resumeRegistration();
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  // ---- Traveller search ----
  useEffect(() => {
    let cancelled = false;
    async function loadTravellers() {
      try {
        const result = await api.listTravellers(1, 100);
        if (!cancelled) setTravellers(result.data);
      } catch {
        // ignore
      }
    }
    void loadTravellers();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Contact search ----
  useEffect(() => {
    let cancelled = false;
    async function loadContacts() {
      try {
        const result = await api.listContactPersons(1, 100);
        if (!cancelled) setContacts(result.data);
      } catch {
        // ignore
      }
    }
    void loadContacts();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Load traveller documents when traveller is selected ----
  const loadTravellerDocuments = useCallback(async () => {
    if (!selectedTravellerId) return;
    try {
      const result = await documentsApi.listTravellerDocuments(
        selectedTravellerId,
        1,
        100,
      );
      setTravellerDocuments(result.data);
    } catch {
      // ignore
    }
  }, [selectedTravellerId]);

  useEffect(() => {
    void loadTravellerDocuments();
  }, [loadTravellerDocuments]);

  // ---- Load intake data (guarantees, finance, operational summary) ----
  const loadRegistrationIntakeData = useCallback(async () => {
    if (!registration) return;
    const results = await Promise.allSettled([
      api.listRegistrationGuarantees(registration.id),
      api.getRegistrationFinanceSummary(registration.id),
      api.getRegistrationOperationalSummary(registration.id),
      api.listFinanceExceptions(1, 10, registration.id),
      api.listCreditExceptionRequests(1, 10, registration.id),
    ]);

    const [
      guaranteesResult,
      financeResult,
      summaryResult,
      exceptionsResult,
      requestsResult,
    ] = results;
    if (guaranteesResult.status === 'fulfilled') {
      setGuarantees(guaranteesResult.value);
    } else {
      console.error(
        'Failed to load registration guarantees',
        guaranteesResult.reason,
      );
    }
    if (financeResult.status === 'fulfilled') {
      setFinanceSummary(financeResult.value);
    } else {
      console.error(
        'Failed to load registration finance',
        financeResult.reason,
      );
    }
    if (summaryResult.status === 'fulfilled') {
      const summary = summaryResult.value;
      setOperationalSummary(summary);

      const invoice = summary.invoices?.[0];

      if (invoice) {
        setRegistrationDiscountType(invoice.discount_type);
        setRegistrationDiscountValue(String(invoice.discount_value ?? 0));
      } else {
        setRegistrationDiscountType('FIXED');
        setRegistrationDiscountValue('0');
      }
    } else {
      console.error('Failed to load operational summary', summaryResult.reason);
    }
    if (exceptionsResult.status === 'fulfilled') {
      const active = exceptionsResult.value.data.find(
        (e) => e.status?.code === 'ACTIVE',
      );
      setActiveException(active ?? null);
    }
    if (requestsResult.status === 'fulfilled') {
      const pending = requestsResult.value.data.find(
        (r) => r.status?.code === 'PENDING',
      );
      setPendingRequest(pending ?? null);
    }
  }, [registration]);

  useEffect(() => {
    void loadRegistrationIntakeData();
  }, [loadRegistrationIntakeData]);

  // ---- Load operational summary for review step ----
  const loadOperationalSummary = useCallback(async () => {
    if (!registration) return;
    try {
      const summary = await api.getRegistrationOperationalSummary(
        registration.id,
      );
      setOperationalSummary(summary);
    } catch {
      // ignore
    }
  }, [registration]);

  useEffect(() => {
    if (stepIndex >= 5 && !operationalSummary) {
      void loadOperationalSummary();
    }
  }, [operationalSummary, stepIndex, loadOperationalSummary]);

  // ---- Pre-fill guarantee form when entering the step with an existing guarantee ----
  useEffect(() => {
    if (stepIndex === 3) {
      const active = guarantees.find((g) => g.guarantee_status === 'ACTIVE');
      if (active) {
        setGuaranteeType(active.guarantee_type);
        setGuaranteeContactId(active.contact_person_id ?? '');
        setGuaranteeAmount(active.amount ? String(active.amount) : '');
        setGuaranteeCurrencyId(active.currency_id ?? '');
        setGuaranteeReference(active.instrument_reference ?? '');
        setGuaranteeExpiry(active.expiry_date ?? '');
        setGuaranteeIssuer(active.issuer ?? '');
        setGuaranteeNotes(active.notes ?? '');
      } else {
        setGuaranteeEditing(false);
      }
    }
  }, [stepIndex, guarantees]);

  // ---- Load payers for finance step ----
  useEffect(() => {
    if (stepIndex === 4 && registration) {
      void (async () => {
        try {
          const result = await api.listPayers(1, 25);
          setPayers(result.data);
        } catch {
          // ignore
        }
      })();
    }
  }, [stepIndex, registration]);

  // ---- Step 1: Create registration ----
  async function handleCreateRegistration() {
    if (
      !selectedTravellerId ||
      !selectedPackageVersionId ||
      !selectedTravelRoundId
    ) {
      toast.error('Select a traveler, package version, and travel round');
      return;
    }
    setSubmitting(true);
    try {
      const reg = await api.createRegistration({
        traveller_id: selectedTravellerId,
        package_version_id: selectedPackageVersionId,
        travel_round_id: selectedTravelRoundId,
        expected_departure_date: expectedDepartureDate || undefined,
        expected_return_date: expectedReturnDate || undefined,
        remarks: remarks || undefined,
      });
      setRegistration(reg);
      setStepIndex(1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message, {
          duration: Infinity,
          action: {
            label: 'Go to worklist',
            onClick: () => navigate('/registrations'),
          },
        });
      } else {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create registration',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Step 1: Update existing registration (e.g. package change) ----
  async function handleUpdateRegistration() {
    if (!registration || !selectedPackageVersionId) return;
    setSubmitting(true);
    try {
      const reg = await api.updateRegistration(registration.id, {
        package_version_id: selectedPackageVersionId,
        expected_departure_date: expectedDepartureDate || undefined,
        expected_return_date: expectedReturnDate || undefined,
        remarks: remarks || undefined,
      });
      setRegistration(reg);
      await loadRegistrationIntakeData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update registration',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Step 3: Emergency contact ----
  async function handleLinkContact() {
    if (!registration || !selectedContactId || !selectedTravellerId) return;
    setSubmitting(true);
    try {
      const activeStatus = travellerContactStatuses.find(
        (s) =>
          (s as { status_code?: string }).status_code?.toUpperCase() ===
          'ACTIVE',
      );
      const relationshipId = relationshipTypes[0]?.id;
      if (!activeStatus) {
        toast.error('No active traveller contact status found');
        return;
      }
      if (!relationshipId) {
        toast.error('No relationship type found');
        return;
      }
      try {
        await api.createTravellerContact(selectedTravellerId, {
          contact_person_id: selectedContactId,
          relationship_type_id: relationshipId,
          is_emergency_contact: true,
          is_primary_contact: true,
          traveller_contact_status_id: activeStatus.id,
        });
      } catch (err) {
        // 409 Conflict means the contact is already linked.
        // Update the existing link to set primary + emergency flags
        // so the readiness gate is satisfied.
        const status = (err as { status?: number }).status;
        if (status !== 409) throw err;
        const existingContacts =
          await api.listTravellerContacts(selectedTravellerId);
        const existing = existingContacts.find(
          (c) => c.contact_person?.id === selectedContactId,
        );
        if (!existing) {
          toast.error(
            'Could not update the existing contact link. Refresh and try again.',
          );
          return;
        }
        await api.updateTravellerContact(selectedTravellerId, existing.id, {
          is_primary_contact: true,
          is_emergency_contact: true,
          traveller_contact_status_id: activeStatus.id,
        });
      }
      setLinkedContactId(selectedContactId);
      await loadRegistrationIntakeData();
      setStepIndex(3);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to link contact',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateContact(
    values: import('../types/travellers.types').ContactPersonFormOutput,
  ) {
    setContactDialogError(null);
    try {
      const contact = await api.createContactPerson(values);
      setContactDialogSuccess('Contact person created successfully');
      setSelectedContactId(contact.id);
      setContacts((prev) => [contact, ...prev]);
      setTimeout(() => {
        setContactDialogOpen(false);
        setContactDialogSuccess(null);
      }, 1200);
    } catch (err) {
      setContactDialogError(
        err instanceof Error ? err.message : 'Failed to create contact',
      );
    }
  }

  // ---- Step 4: Guarantee (create or update) ----
  async function handleCreateGuarantee() {
    if (!registration) return;
    if (guaranteeType === 'PERSON' && !guaranteeContactId) {
      toast.error('Select a contact for PERSON guarantee');
      return;
    }
    setSubmitting(true);
    try {
      const input: Record<string, unknown> = {
        guarantee_type: guaranteeType,
      };
      if (guaranteeType === 'PERSON') {
        input.contact_person_id = guaranteeContactId;
      } else {
        if (guaranteeAmount) input.amount = Number(guaranteeAmount);
        if (guaranteeCurrencyId) input.currency_id = guaranteeCurrencyId;
        if (guaranteeReference) input.instrument_reference = guaranteeReference;
        if (guaranteeExpiry) input.expiry_date = guaranteeExpiry;
        if (guaranteeIssuer) input.issuer = guaranteeIssuer;
        if (guaranteeNotes) input.notes = guaranteeNotes;
      }
      const active = guarantees.find((g) => g.guarantee_status === 'ACTIVE');
      if (active) {
        await api.updateGuarantee(active.id, input as any);
      } else {
        await api.createRegistrationGuarantee(registration.id, input as any);
      }
      await loadRegistrationIntakeData();
      setGuaranteeEditing(false);
      setStepIndex(4);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save guarantee',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Step 5: Finance — create invoice + record payment ----
  async function handleCreateInvoice() {
    if (!registration || !selectedPackage) return;
    setSubmitting(true);
    try {
      await api.createInvoice({
        registration_id: registration.id,
        invoice_date: today(),
        discount_type: registrationDiscountType,
        discount_value: Number(registrationDiscountValue || 0),
        line_items: [
          {
            description: `Package: ${selectedPackage.version_name}`,
            quantity: 1,
            unit_price:
              Number(invoiceAmount) > 0
                ? Number(invoiceAmount)
                : selectedPackage.base_price,
          },
        ],
      });
      setInvoiceAmount('');
      await loadRegistrationIntakeData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create invoice',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRegistrationDiscount() {
    const invoice = operationalSummary?.invoices?.[0];

    if (!invoice) {
      toast.error('Invoice details are unavailable. Refresh and try again.');
      return;
    }

    const value = Number(registrationDiscountValue || 0);
    const subtotal = Number(invoice.subtotal);

    const discountAmount =
      registrationDiscountType === 'PERCENT'
        ? Math.round(((subtotal * value) / 100) * 100) / 100
        : value;

    const valid =
      Number.isFinite(value) &&
      value >= 0 &&
      (registrationDiscountType === 'PERCENT'
        ? value <= 100
        : discountAmount <= subtotal);

    if (!valid) {
      toast.error(
        registrationDiscountType === 'PERCENT'
          ? 'Discount percentage must be between 0 and 100.'
          : 'Discount cannot exceed the invoice subtotal.',
      );
      return;
    }

    setSubmitting(true);

    try {
      await api.updateInvoice(invoice.id, {
        discount_type: registrationDiscountType,
        discount_value: value,
      });

      await loadRegistrationIntakeData();
      toast.success('Invoice discount updated successfully.');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to update invoice discount',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreatePayer(useTraveller: boolean) {
    if (!registration || !selectedTraveller) return;
    if (!useTraveller && (!customPayerName || !customPayerPhone)) {
      toast.error('Enter payer name and phone number');
      return;
    }
    setSubmitting(true);
    try {
      const individualType = payerTypes.find(
        (t) =>
          (t as { type_code?: string }).type_code?.toUpperCase() ===
          'INDIVIDUAL',
      );
      if (!individualType) {
        toast.error('No individual payer type found');
        return;
      }
      const payer = await api.createPayer({
        payer_type_id: individualType.id,
        traveller_id: useTraveller ? selectedTravellerId : undefined,
        contact_name: useTraveller
          ? `${selectedTraveller.first_name} ${selectedTraveller.last_name}`
          : customPayerName,
        phone_number: useTraveller
          ? selectedTraveller.phone_number
          : customPayerPhone,
      });
      setPayerId(payer.id);
      setPayers((prev) => [payer as any, ...prev]);
      setShowCustomPayerForm(false);
      setCustomPayerName('');
      setCustomPayerPhone('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create payer',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordPayment(amountOverride?: number) {
    const amount =
      amountOverride ?? Number(paymentAmount);
    if (
      !registration ||
      !payerId ||
      !paymentMethodId ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error('Fill in payer, method, and a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      const currencyId = selectedPackage?.currency_id ?? '';
      if (!currencyId) {
        toast.error('No currency on package');
        return;
      }
      const payment = await api.createPayment({
        payer_id: payerId,
        payment_method_id: paymentMethodId,
        payment_date: today(),
        original_amount: amount,
        original_currency_id: currencyId,
        exchange_rate: 1,
        reference_number: paymentReference || undefined,
      });
      // Allocate to the first invoice
      if (operationalSummary?.invoices?.[0]) {
        await api.allocatePayment(payment.id, {
          allocations: [
            {
              invoice_id: operationalSummary.invoices[0].id,
              allocated_amount: amount,
            },
          ],
        });
      }
      setPaymentAmount('');
      setPaymentReference('');
      await Promise.all([
        loadRegistrationIntakeData(),
        loadOperationalSummary(),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to record payment',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Applies any pending discount change to the invoice, then records the
  // payment against the (possibly newly discounted) outstanding balance.
  async function handlePaymentWithDiscount() {
    const invoice = operationalSummary?.invoices?.[0];

    // Compute the outstanding balance as it will be after the pending
    // discount is applied — the payment must be validated against this,
    // not the stale pre-discount balance.
    let postDiscountOutstanding = outstandingBalance;
    if (invoice) {
      const subtotal = Number(invoice.subtotal);
      const value = Number(registrationDiscountValue || 0);
      const discountAmt =
        registrationDiscountType === 'PERCENT'
          ? Math.round(((subtotal * value) / 100) * 100) / 100
          : value;
      const newTotal = Math.max(
        0,
        Math.round((subtotal - discountAmt) * 100) / 100,
      );
      const allocated = Math.max(
        0,
        Number(invoice.total_amount) - Number(invoice.outstanding_balance),
      );
      postDiscountOutstanding = Math.max(0, newTotal - allocated);

      const changed =
        registrationDiscountType !== invoice.discount_type ||
        value !== Number(invoice.discount_value);
      if (changed) {
        setSubmitting(true);
        try {
          await api.updateInvoice(invoice.id, {
            discount_type: registrationDiscountType,
            discount_value: value,
          });
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : 'Failed to update invoice discount',
          );
          setSubmitting(false);
          return;
        }
        setSubmitting(false);
      }
    }

    const amount = Number(paymentAmount || postDiscountOutstanding);
    if (paymentAmount !== '' && amount > postDiscountOutstanding + 0.005) {
      toast.error(
        `Amount exceeds the outstanding balance (${formatMoney(postDiscountOutstanding)})`,
      );
      return;
    }
    await handleRecordPayment(amount);
  }

  // ---- Step 7: Complete registration ----
  async function handleCompleteRegistration() {
    if (!registration) return;
    setSubmitting(true);
    try {
      // Refresh operational summary to get latest readiness
      const summary = await api.getRegistrationOperationalSummary(
        registration.id,
      );
      setOperationalSummary(summary);
      if (!summary.readiness?.can_start_processing) {
        toast.error('Registration is not ready for processing');
        return;
      }
      await api.startRegistrationProcessing(registration.id);
      toast.success('Registration completed successfully.');
      navigate('/registrations');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to complete registration',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Derived state ----
  const passportType = documentTypes.find((t) => t.type_code === 'PASSPORT');
  const photoType = documentTypes.find((t) => t.type_code === 'PHOTO');

  // Documents are traveller-scoped (managed on the traveller profile) —
  // this mirrors the backend readiness check on documents.traveller_id.
  const travellerDocTypeIds = new Set(
    travellerDocuments.map((d) => d.document_type?.id),
  );

  const hasPassport = passportType
    ? travellerDocTypeIds.has(passportType.id)
    : false;
  const hasPhoto = photoType
    ? travellerDocTypeIds.has(photoType.id)
    : false;

  const hasGuarantee = guarantees.some((g) => g.guarantee_status === 'ACTIVE');

  // Guarantee form is valid when:
  // - PERSON type: a contact is selected
  // - Non-PERSON type: an amount and currency are provided
  const canCreateGuarantee =
    guaranteeType === 'PERSON'
      ? !!guaranteeContactId
      : !!guaranteeAmount && !!guaranteeCurrencyId;

  const hasInvoice =
    (operationalSummary?.invoices?.length ?? 0) > 0 ||
    (financeSummary?.total_invoiced ?? 0) > 0;
  const outstandingBalance = financeSummary?.outstanding_balance ?? 0;
  const readiness = operationalSummary?.readiness;
  // Use the readiness service's payment_satisfied as the source of truth —
  // it accounts for both zero balance AND active credit exceptions.
  const paymentSatisfied =
    hasInvoice && (readiness?.payment_satisfied ?? outstandingBalance <= 0);

  const canComplete = readiness?.can_start_processing ?? false;

  const currentStep = WORKFLOW_STEPS[stepIndex];

  // ---- Step validation ----
  function canAdvance(): boolean {
    switch (currentStep.key) {
      case 'traveler':
        return (
          !!selectedTravellerId && !!selectedPackageVersionId && !submitting
        );
      case 'contact':
        return !!linkedContactId || !!selectedContactId;
      case 'guarantee':
        if (guaranteeEditing) return canCreateGuarantee && !submitting;
        return hasGuarantee || canCreateGuarantee;
      case 'finance':
        return paymentSatisfied;
      case 'review':
        return canComplete;
      default:
        return true;
    }
  }

  async function handleNext() {
    if (currentStep.key === 'traveler' && !registration) {
      void handleCreateRegistration();
      return;
    }
    if (currentStep.key === 'traveler' && registration) {
      // Save any changes (e.g. package version change) before advancing
      await handleUpdateRegistration();
    }
    if (currentStep.key === 'contact' && !linkedContactId) {
      void handleLinkContact();
      return;
    }
    if (
      currentStep.key === 'guarantee' &&
      (!hasGuarantee || guaranteeEditing)
    ) {
      void handleCreateGuarantee();
      return;
    }
    if (currentStep.key === 'review') {
      void handleCompleteRegistration();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, WORKFLOW_STEPS.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  // ---- Render helpers ----
  function renderStepIndicator() {
    return (
      <FormProgress
        steps={[...WORKFLOW_STEPS]}
        currentStep={stepIndex}
        onStepChange={(step) => setStepIndex(step)}
      />
    );
  }

  function renderTravelerStep() {
    return (
      <RegistrationForm
        mode={registration ? 'edit' : 'create'}
        registration={registration ?? undefined}
        travellers={travellers}
        packageVersions={packageVersions}
        travelRounds={travelRounds}
        onSubmit={async (values) => {
          // In workflow mode, onSubmit is triggered by the Next button
          // via form validation. The actual API call is handled by
          // handleCreateRegistration, but if the registration already
          // exists (resume), we update it — including the package version
          // in case the original package was cancelled or closed.
          if (registration) {
            await api.updateRegistration(registration.id, {
              package_version_id: values.package_version_id,
              expected_departure_date: values.expected_departure_date,
              expected_return_date: values.expected_return_date,
              remarks: values.remarks,
            });
          }
        }}
        workflowMode
        onValuesChange={(values) => {
          setSelectedTravellerId(values.traveller_id);
          setSelectedPackageVersionId(values.package_version_id);
          setSelectedTravelRoundId(values.travel_round_id);
          setExpectedDepartureDate(values.expected_departure_date);
          setExpectedReturnDate(values.expected_return_date);
          setRemarks(values.remarks);
        }}
      />
    );
  }

  function renderContactStep() {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {linkedContactId && (
          <div className="rounded-md bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="inline h-4 w-4 mr-1" />
            Emergency contact linked successfully.
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Select existing contact</Label>
          <Select
            value={selectedContactId ?? ''}
            onValueChange={(v) => setSelectedContactId(v ?? '')}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue>
                {contacts
                  .map((c) => ({
                    value: c.id,
                    label: `${c.first_name} ${c.last_name}`,
                  }))
                  .find((o) => o.value === selectedContactId)?.label ??
                  'Select emergency contact'}
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

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setContactDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create new contact
        </Button>

        {selectedContactId && !linkedContactId && (
          <div className="rounded-md border p-3 text-sm">
            <p className="text-muted-foreground mb-1">
              Selected contact (press Next to link as primary):
            </p>
            {(() => {
              const c = contacts.find((x) => x.id === selectedContactId);
              return c
                ? `${c.first_name} ${c.last_name} — ${c.phone_number}`
                : 'Unknown';
            })()}
          </div>
        )}

        <ContactPersonDialog
          mode="create"
          countries={countries}
          languages={languages}
          statuses={contactStatuses}
          open={contactDialogOpen}
          onOpenChange={(open) => {
            setContactDialogOpen(open);
            if (!open) {
              setContactDialogError(null);
              setContactDialogSuccess(null);
            }
          }}
          onSubmit={handleCreateContact}
          error={contactDialogError}
          success={contactDialogSuccess}
        />
      </div>
    );
  }

  function renderGuaranteeStep() {
    const activeGuarantee = guarantees.find(
      (g) => g.guarantee_status === 'ACTIVE',
    );
    const showForm = !activeGuarantee || guaranteeEditing;

    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {activeGuarantee && (
          <div className="flex items-center justify-between rounded-md bg-success/10 p-3 text-sm text-success">
            <span>
              <CheckCircle2 className="inline h-4 w-4 mr-1" />
              Active guarantee: {activeGuarantee.guarantee_number} (
              {activeGuarantee.guarantee_type})
            </span>
            {!guaranteeEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGuaranteeEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>
        )}

        {showForm && (
          <>
            {guaranteeType === 'PERSON' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Guarantee type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={guaranteeType ?? ''}
                    onValueChange={(v) =>
                      setGuaranteeType(v as Guarantee['guarantee_type'])
                    }
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {GUARANTEE_TYPES.find((o) => o.value === guaranteeType)
                          ?.label ?? 'Select guarantee type'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GUARANTEE_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Select contact <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={guaranteeContactId ?? ''}
                    onValueChange={(v) => setGuaranteeContactId(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {contacts
                          .map((c) => ({
                            value: c.id,
                            label: `${c.first_name} ${c.last_name}`,
                          }))
                          .find((o) => o.value === guaranteeContactId)?.label ??
                          'Select a contact'}
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
                  {contacts.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No contacts loaded. Go back to the contact step to create
                      one.
                    </p>
                  )}
                </div>
              </>
            )}

            {guaranteeType !== 'PERSON' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Guarantee type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={guaranteeType ?? ''}
                    onValueChange={(v) =>
                      setGuaranteeType(v as Guarantee['guarantee_type'])
                    }
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {GUARANTEE_TYPES.find((o) => o.value === guaranteeType)
                          ?.label ?? 'Select guarantee type'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GUARANTEE_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Reference number
                  </Label>
                  <Input
                    value={guaranteeReference}
                    onChange={(e) => setGuaranteeReference(e.target.value)}
                    className="h-9 w-full"
                    placeholder="Optional — must be unique"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Leave blank for cash deposits without a receipt
                    number.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={guaranteeAmount}
                    onChange={(e) => setGuaranteeAmount(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Currency <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={guaranteeCurrencyId ?? ''}
                    onValueChange={(v) => setGuaranteeCurrencyId(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {currencies
                          .map((c) => ({
                            value: c.id,
                            label: c.name,
                          }))
                          .find((o) => o.value === guaranteeCurrencyId)
                          ?.label ?? 'Select currency'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencies
                        .map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expiry date</Label>
                  <DatePicker
                    value={guaranteeExpiry}
                    onChange={setGuaranteeExpiry}
                    placeholder="Select date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Issuer</Label>
                  <Input
                    value={guaranteeIssuer}
                    onChange={(e) => setGuaranteeIssuer(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    value={guaranteeNotes}
                    onChange={(e) => setGuaranteeNotes(e.target.value)}
                    rows={2}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {activeGuarantee && guaranteeEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGuaranteeEditing(false)}
              >
                Cancel edit
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  function renderFinanceStep() {
    const packagePrice = Number(selectedPackage?.base_price ?? 0);
    const invoice = operationalSummary?.invoices?.[0] ?? null;

    // In create mode the subtotal is the editable invoice amount (defaulting
    // to the package price); when editing it is the invoice's stored subtotal.
    const createSubtotal =
      invoiceAmount !== '' && Number.isFinite(Number(invoiceAmount))
        ? Math.max(0, Number(invoiceAmount))
        : packagePrice;
    const discountBase = invoice ? Number(invoice.subtotal) : createSubtotal;
    const discountValue = Number(registrationDiscountValue || 0);

    const rawDiscountAmount =
      registrationDiscountType === 'PERCENT'
        ? Math.round(((discountBase * discountValue) / 100) * 100) / 100
        : discountValue;

    const registrationDiscountAmount = Number.isFinite(rawDiscountAmount)
      ? rawDiscountAmount
      : 0;

    const registrationDiscountValid =
      Number.isFinite(discountValue) &&
      discountValue >= 0 &&
      (registrationDiscountType === 'PERCENT'
        ? discountValue <= 100
        : registrationDiscountAmount <= discountBase);

    const proposedInvoiceTotal =
      Math.round(Math.max(0, discountBase - registrationDiscountAmount) * 100) /
      100;

    const allocatedAmount = invoice
      ? Math.max(
          0,
          Number(invoice.total_amount) - Number(invoice.outstanding_balance),
        )
      : 0;

    const discountConflictsWithPayments =
      !!invoice && proposedInvoiceTotal < allocatedAmount - 0.005;

    const currencyCode = selectedPackage?.currency?.code ?? 'ETB';

    const discountChanged =
      !!invoice &&
      (registrationDiscountType !== invoice.discount_type ||
        Number(registrationDiscountValue || 0) !==
          Number(invoice.discount_value));

    // Post-discount outstanding — what will remain owed if the pending
    // discount is applied. Payments are validated against this, not the
    // stale pre-discount balance.
    const postDiscountOutstanding = invoice
      ? Math.max(0, proposedInvoiceTotal - allocatedAmount)
      : outstandingBalance;

    // Payment amount defaults to the full outstanding balance; a typed value
    // is a (possibly partial) override and must not exceed what is owed.
    const paymentAmountInvalid =
      paymentAmount !== '' &&
      (!Number.isFinite(Number(paymentAmount)) ||
        Number(paymentAmount) <= 0 ||
        Number(paymentAmount) > postDiscountOutstanding + 0.005);

    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {selectedPackage && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package price:</span>
              <span className="font-medium">
                {formatMoney(selectedPackage.base_price)}{' '}
                {selectedPackage.currency?.code ?? ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total invoiced:</span>
              <span>{formatMoney(financeSummary?.total_invoiced)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount paid:</span>
              <span>{formatMoney(financeSummary?.total_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span className="text-success">
                − {formatMoney(invoice?.discount_amount ?? 0)}{' '}
                {selectedPackage.currency?.code ?? ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Outstanding balance:
              </span>
              <span
                className={cn(
                  'font-medium',
                  outstandingBalance > 0 ? 'text-destructive' : 'text-success',
                )}
              >
                {formatMoney(outstandingBalance)}
              </span>
            </div>
          </div>
        )}

        {!hasInvoice && !financeFormOpen && selectedPackage && (
          <Button
            type="button"
            onClick={() => setFinanceFormOpen(true)}
            disabled={submitting}
          >
            <FileUp className="h-4 w-4" />
            Create invoice
          </Button>
        )}

        {hasInvoice && outstandingBalance <= 0 && !financeFormOpen && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-4 text-sm">
              <p className="text-success font-medium">
                Payment complete. No outstanding balance.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFinanceFormOpen(true)}
              disabled={submitting}
            >
              Edit discount
            </Button>
          </div>
        )}

        {(financeFormOpen || hasInvoice) && (
          <div className="space-y-6 rounded-md border p-4">
            <h4 className="font-medium text-sm">
              {hasInvoice ? 'Record payment' : 'Create invoice'}
            </h4>

            {/* Payer & payment details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Payer <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={payerId ?? ''}
                    onValueChange={(v) => setPayerId(v ?? '')}
                  >
                    <SelectTrigger
                      className={cn('h-9 w-full', 'w-full sm:flex-1')}
                    >
                      <SelectValue>
                        {payers
                          .map((p) => ({
                            value: p.id,
                            label: `${p.contact_name ?? p.payer_number}`,
                          }))
                          .find((o) => o.value === payerId)?.label ??
                          'Select payer'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {payers
                        .map((p) => ({
                          value: p.id,
                          label: `${p.contact_name ?? p.payer_number}`,
                        }))
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCreatePayer(true)}
                      disabled={submitting}
                    >
                      Use traveller
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomPayerForm((v) => !v)}
                      disabled={submitting}
                    >
                      <Plus className="h-4 w-4" />
                      Other payer
                    </Button>
                  </div>
                </div>
                {showCustomPayerForm && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Payer name</Label>
                        <Input
                          value={customPayerName}
                          onChange={(e) => setCustomPayerName(e.target.value)}
                          placeholder="Full name"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone number</Label>
                        <Input
                          value={customPayerPhone}
                          onChange={(e) => setCustomPayerPhone(e.target.value)}
                          placeholder="Phone number"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleCreatePayer(false)}
                      disabled={
                        submitting || !customPayerName || !customPayerPhone
                      }
                    >
                      Create payer
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Payment method <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={paymentMethodId ?? ''}
                    onValueChange={(v) => setPaymentMethodId(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {paymentMethods.find((m) => m.id === paymentMethodId)
                          ?.name ?? 'Select method'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reference number</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Amount & discount */}
            <div className="space-y-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  {hasInvoice ? (
                    <>
                      <Input
                        type="number"
                        value={
                          paymentAmount === ''
                            ? String(postDiscountOutstanding)
                            : paymentAmount
                        }
                        onChange={(event) =>
                          setPaymentAmount(event.target.value)
                        }
                        min={0}
                        className="h-9 w-full"
                        aria-invalid={paymentAmountInvalid}
                      />
                      {paymentAmountInvalid ? (
                        <p className="text-xs text-destructive">
                          Amount must be between 0 and the outstanding balance
                          ({formatMoney(postDiscountOutstanding)} {currencyCode}
                          ).
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Defaults to the full outstanding balance — lower it
                          only for a partial payment.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Input
                        type="number"
                        value={invoiceAmount}
                        onChange={(event) =>
                          setInvoiceAmount(event.target.value)
                        }
                        placeholder={String(packagePrice)}
                        min={0}
                        className="h-9 w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Invoice amount — defaults to the full package price.
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Discount type</Label>
                  <div className="flex h-9 flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="registration-discount-type"
                        value="FIXED"
                        checked={registrationDiscountType === 'FIXED'}
                        onChange={() => setRegistrationDiscountType('FIXED')}
                        className="h-4 w-4 accent-primary"
                      />
                      Fixed amount
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="registration-discount-type"
                        value="PERCENT"
                        checked={registrationDiscountType === 'PERCENT'}
                        onChange={() => setRegistrationDiscountType('PERCENT')}
                        className="h-4 w-4 accent-primary"
                      />
                      Percentage
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="registration-discount-value"
                    className="text-sm font-medium"
                  >
                    {registrationDiscountType === 'PERCENT'
                      ? 'Discount percentage'
                      : `Discount amount (${selectedPackage?.currency?.code ?? 'ETB'})`}
                  </Label>
                  <Input
                    id="registration-discount-value"
                    type="number"
                    min={0}
                    max={registrationDiscountType === 'PERCENT' ? 100 : undefined}
                    step="0.01"
                    value={registrationDiscountValue}
                    onChange={(event) =>
                      setRegistrationDiscountValue(event.target.value)
                    }
                    className="h-9 w-full"
                    aria-invalid={!registrationDiscountValid}
                  />
                  {!registrationDiscountValid && (
                    <p className="text-sm text-destructive">
                      {registrationDiscountType === 'PERCENT'
                        ? 'Percentage must be between 0 and 100.'
                        : 'Discount cannot exceed the invoice subtotal.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Real-time invoice preview */}
              {selectedPackage && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      {formatMoney(discountBase)} {currencyCode}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      Discount
                      {registrationDiscountType === 'PERCENT'
                        ? ` (${discountValue}%)`
                        : ''}
                    </span>
                    <span>
                      − {formatMoney(registrationDiscountAmount)} {currencyCode}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
                    <span>Invoice total</span>
                    <span>
                      {registrationDiscountValid
                        ? formatMoney(proposedInvoiceTotal)
                        : 'Check discount value'}{' '}
                      {currencyCode}
                    </span>
                  </div>
                  {hasInvoice && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        New outstanding
                      </span>
                      <span>
                        {formatMoney(postDiscountOutstanding)} {currencyCode}
                      </span>
                    </div>
                  )}
                  {discountConflictsWithPayments && (
                    <p className="text-xs text-destructive">
                      Cannot reduce total below allocated amount (
                      {formatMoney(allocatedAmount)} {currencyCode})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {!hasInvoice ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleCreateInvoice()}
                  disabled={submitting || !registrationDiscountValid}
                >
                  {submitting ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  Create invoice
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFinanceFormOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {outstandingBalance > 0 && (
                  <Button
                    type="button"
                    onClick={() => void handlePaymentWithDiscount()}
                    disabled={
                      submitting ||
                      !payerId ||
                      !paymentMethodId ||
                      postDiscountOutstanding <= 0 ||
                      paymentAmountInvalid ||
                      !registrationDiscountValid ||
                      discountConflictsWithPayments
                    }
                  >
                    {submitting ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : null}
                    Record payment
                  </Button>
                )}
                {discountChanged && (
                  <Button
                    type="button"
                    onClick={() => void handleUpdateRegistrationDiscount()}
                    disabled={
                      submitting ||
                      !registrationDiscountValid ||
                      discountConflictsWithPayments
                    }
                  >
                    {submitting ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : null}
                    Update discount
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFinanceFormOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {hasInvoice && outstandingBalance > 0 && !activeException && (
          <div className="space-y-3 rounded-md border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium">Request credit exception</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Payment is required to continue. You can request an exception
                  for Admin approval instead of recording a payment.
                </p>
              </div>
            </div>
            {pendingRequest ? (
              <div className="rounded-md bg-warning/10 p-3 text-sm">
                <p className="font-medium text-warning">
                  Credit exception requested
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Awaiting Admin approval — {pendingRequest.request_number}
                </p>
              </div>
            ) : can('FINANCE_CREDIT_REQUEST') ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting || !registration}
                onClick={() => setRequestDialogOpen(true)}
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Request credit exception
              </Button>
            ) : can('FINANCE_CREDIT_AUTHORIZE') ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting || !registration}
                onClick={() =>
                  navigate(
                    `/finance-exceptions/new?registration_id=${registration?.id}`,
                  )
                }
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Authorize credit
              </Button>
            ) : null}
          </div>
        )}

        {hasInvoice && activeException && outstandingBalance > 0 && (
          <div className="space-y-2 rounded-md bg-primary/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authorized credit</span>
              <span className="font-medium text-primary">
                {formatMoney(
                  readiness?.authorized_credit_amount ??
                    activeException.authorized_amount,
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Credit exception {activeException.exception_number} approved.
              Payment requirement is satisfied.
            </p>
          </div>
        )}

        {hasInvoice && outstandingBalance <= 0 && (
          <div className="rounded-md bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="inline h-4 w-4 mr-1" />
            Payment requirement satisfied. Outstanding balance is zero.
          </div>
        )}

        {registration && requestDialogOpen && (
          <CreditExceptionRequestDialog
            open={requestDialogOpen}
            onOpenChange={setRequestDialogOpen}
            registrationId={registration.id}
            registrationNumber={registration.registration_number}
            outstandingBalance={outstandingBalance}
            onRequested={() => void loadRegistrationIntakeData()}
          />
        )}
      </div>
    );
  }

  function renderReviewStep() {
    const items: Array<{
      label: string;
      satisfied: boolean;
      detail?: string;
      action?: { to: string; label: string };
    }> = [
      {
        label: 'Traveler selected',
        satisfied: !!selectedTraveller,
        detail: selectedTraveller
          ? `${selectedTraveller.first_name} ${selectedTraveller.last_name}`
          : 'Not selected',
      },
      {
        label: 'Required documents (passport + photo)',
        satisfied: hasPassport && hasPhoto,
        detail:
          hasPassport && hasPhoto
            ? 'Passport and photo attached'
            : `Missing: ${!hasPassport ? 'passport' : ''}${!hasPassport && !hasPhoto ? ', ' : ''}${!hasPhoto ? 'photo' : ''}`,
        action:
          !(hasPassport && hasPhoto) && selectedTravellerId
            ? {
                to: `/travellers/${selectedTravellerId}`,
                label: 'Manage on traveller profile',
              }
            : undefined,
      },
      {
        label: 'Emergency contact',
        satisfied: !!linkedContactId,
        detail: linkedContactId
          ? 'Primary contact linked'
          : selectedContactId
            ? 'Selected — go back and link it'
            : 'Missing',
      },
      {
        label: 'Guarantee',
        satisfied: hasGuarantee,
        detail: hasGuarantee ? 'Active guarantee on file' : 'Missing guarantee',
      },
      {
        label: 'Payment requirement',
        satisfied: paymentSatisfied,
        detail: paymentSatisfied
          ? outstandingBalance > 0 && activeException
            ? `Credit exception approved: ${formatMoney(activeException.authorized_amount)}`
            : 'Invoice paid in full'
          : hasInvoice
            ? `Outstanding: ${formatMoney(outstandingBalance)}`
            : 'No invoice created',
      },
    ];

    const allSatisfied = items.every((i) => i.satisfied);

    return (
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-3 rounded-md border p-3 text-sm"
            >
              {item.satisfied ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.label}</p>
                {item.detail && (
                  <p className="text-muted-foreground">{item.detail}</p>
                )}
                {item.action && (
                  <Link
                    to={item.action.to}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {item.action.label}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>

        {allSatisfied ? (
          <div className="rounded-md bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="inline h-4 w-4 mr-1" />
            All intake requirements satisfied. The registration will enter
            Processing when you complete this step.
          </div>
        ) : (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Some requirements are missing. Go back to the relevant step to
            resolve the blockers.
          </div>
        )}

        {readiness && readiness.blockers.length > 0 && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium mb-1">Requirements to resolve:</p>
            <ul className="list-disc list-inside text-muted-foreground">
              {formatBlockers(readiness.blockers).map((label, i) => (
                <li key={readiness.blockers[i]}>{label}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ---- Main render ----
  if (resuming) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading registration…
        </span>
      </div>
    );
  }

  function renderStepNav() {
    const isReview = currentStep.key === 'review';
    return (
      <div className="flex items-center justify-between">
        {/* Left: Back + Discard (Discard on all steps) */}
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/registrations')}>
            Discard
          </Button>
        </div>

        {/* Right: Next / Complete */}
        <Button onClick={handleNext} disabled={!canAdvance()}>
          {submitting ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : isReview ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {isReview
            ? 'Register'
            : currentStep.key === 'guarantee' && guaranteeEditing
              ? 'Save'
              : 'Next'}
        </Button>
      </div>
    );
  }

  const stepTitles: Record<string, string> = {
    traveler: 'Traveler & package',
    contact: 'Emergency contact',
    guarantee: 'Guarantee',
    finance: 'Payment',
    review: 'Review',
  };

  const stepsInCard =
    currentStep.key === 'traveler' ||
    currentStep.key === 'contact' ||
    currentStep.key === 'guarantee' ||
    currentStep.key === 'finance' ||
    currentStep.key === 'review';

  return (
    <div className="space-y-8 pb-20 sm:pb-0">
      {renderStepIndicator()}

      {/* Steps using the shared card wrapper */}
      {stepsInCard && (
        <Card className="mx-auto w-full max-w-4xl md:border-none md:drop-shadow-2xl">
          <CardHeader>
            <CardTitle>{stepTitles[currentStep.key]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep.key === 'traveler' && renderTravelerStep()}

            {currentStep.key === 'contact' && renderContactStep()}
            {currentStep.key === 'guarantee' && renderGuaranteeStep()}
            {currentStep.key === 'finance' && renderFinanceStep()}
            {currentStep.key === 'review' && renderReviewStep()}
            {/* Desktop/tablet: nav inside card with spacing */}
            <div className="hidden border-t pt-6 sm:block">
              {renderStepNav()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile: fixed bottom bar, always visible above keyboard */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-3 sm:hidden">
        {renderStepNav()}
      </div>
    </div>
  );
}
