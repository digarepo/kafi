/**
 * Guided registration intake workflow.
 *
 * Walks staff through the complete registration intake process:
 *   1. Traveler selection
 *   2. Registration documents (passport, photo, other)
 *   3. Emergency contact
 *   4. Guarantee
 *   5. Finance / payment
 *   6. Review
 *   7. Complete registration
 *
 * The workflow creates the registration on step 1, then progressively
 * attaches intake requirements. When all conditions are satisfied the
 * system transitions the registration from DRAFT to PROCESSING.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { DateRange } from 'react-day-picker';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileUp,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
  cn,
} from '@kafi/ui';

import { api } from '../../../lib/api.js';
import {
  documentsApi,
  type DocumentListItem,
  type DocumentType,
} from '../../documents/lib/api.js';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import { AsyncLookupSelect } from './async-lookup-select';
import { LookupSelect } from './lookup-select';
import { ContactPersonDialog } from './contact-person-dialog';
import { DateRangePicker } from '../../packages/components/date-range-picker';
import { parseYmd, toYmd } from '../lib/date';
import type {
  ContactPerson,
  Country,
  Guarantee,
  Language,
  LookupOption,
  PackageVersion,
  Registration,
  RegistrationOperationalSummary,
  Traveller,
} from '../../../lib/api.js';

const WORKFLOW_STEPS = [
  { key: 'traveler', label: 'Traveler' },
  { key: 'documents', label: 'Documents' },
  { key: 'contact', label: 'Emergency Contact' },
  { key: 'guarantee', label: 'Guarantee' },
  { key: 'finance', label: 'Finance / Payment' },
  { key: 'review', label: 'Review' },
  { key: 'complete', label: 'Complete' },
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
  return Number(value).toFixed(2);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RegistrationIntakeWorkflow({
  packageVersions,
  registrationId,
}: {
  packageVersions: PackageVersion[];
  registrationId?: string;
}) {
  const navigate = useNavigate();
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
  const [travellerSearch, setTravellerSearch] = useState('');
  const debouncedTravellerSearch = useDebouncedValue(travellerSearch);
  const [travellerLoading, setTravellerLoading] = useState(false);
  const [selectedTravellerId, setSelectedTravellerId] = useState('');
  const [selectedPackageVersionId, setSelectedPackageVersionId] = useState('');
  const [expectedDepartureDate, setExpectedDepartureDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [manualDates, setManualDates] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [registration, setRegistration] = useState<Registration | null>(null);

  // Step 2: Documents
  const [travellerDocuments, setTravellerDocuments] = useState<
    DocumentListItem[]
  >([]);
  const [registrationDocuments, setRegistrationDocuments] = useState<
    DocumentListItem[]
  >([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Step 3: Emergency contact
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const debouncedContactSearch = useDebouncedValue(contactSearch);
  const [contactLoading, setContactLoading] = useState(false);
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
  const [paymentReference, setPaymentReference] = useState('');
  const [showCustomPayerForm, setShowCustomPayerForm] = useState(false);
  const [customPayerName, setCustomPayerName] = useState('');
  const [customPayerPhone, setCustomPayerPhone] = useState('');

  // Step 6-7: Review & complete
  const [operationalSummary, setOperationalSummary] =
    useState<RegistrationOperationalSummary | null>(null);
  const [completed, setCompleted] = useState(false);

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
        let regDocCount = 0;
        let travDocCount = 0;
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
              travDocCount = docs.data.length;
            }
          } catch {
            // ignore
          }
          // Load existing traveller contacts to restore linked contact
          try {
            const contacts = await api.listTravellerContacts(travellerId);
            if (!cancelled) {
              // Prefer primary/emergency contact, fall back to any active contact
              const primary =
                contacts.find(
                  (c) => c.is_primary_contact || c.is_emergency_contact,
                ) ?? contacts[0];
              if (primary) {
                linkedContact = primary.contact_person?.id ?? null;
                setLinkedContactId(linkedContact);
                setSelectedContactId(linkedContact ?? '');
              }
            }
          } catch {
            // ignore
          }
        }
        try {
          const docsResult = await documentsApi.listRegistrationDocuments(
            registrationId!,
            1,
            100,
          );
          if (!cancelled) {
            setRegistrationDocuments(docsResult.data);
            regDocCount = docsResult.data.length;
          }
        } catch {
          // ignore
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

        const hasDocs = regDocCount > 0 || travDocCount > 0;
        const hasContact = !!linkedContact;
        const hasFin = invoiceCount > 0 && outstandingBalance <= 0;

        if (!reg.traveller?.id || !reg.package_version?.id) {
          setStepIndex(0);
        } else if (!hasDocs) {
          setStepIndex(1);
        } else if (!hasContact) {
          setStepIndex(2);
        } else if (!hasGuar) {
          setStepIndex(3);
        } else if (!hasFin) {
          setStepIndex(4);
        } else {
          setStepIndex(5);
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
      setTravellerLoading(true);
      try {
        const result = await api.listTravellers(
          1,
          25,
          debouncedTravellerSearch || undefined,
        );
        if (!cancelled) setTravellers(result.data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setTravellerLoading(false);
      }
    }
    void loadTravellers();
    return () => {
      cancelled = true;
    };
  }, [debouncedTravellerSearch]);

  // ---- Contact search ----
  useEffect(() => {
    let cancelled = false;
    async function loadContacts() {
      setContactLoading(true);
      try {
        const result = await api.listContactPersons(
          1,
          25,
          debouncedContactSearch || undefined,
        );
        if (!cancelled) setContacts(result.data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setContactLoading(false);
      }
    }
    void loadContacts();
    return () => {
      cancelled = true;
    };
  }, [debouncedContactSearch]);

  // ---- Auto-fill dates from package (unless manually overridden) ----
  useEffect(() => {
    if (manualDates || !selectedPackage) return;
    setExpectedDepartureDate(
      selectedPackage.departure_date?.slice(0, 10) ?? '',
    );
    setExpectedReturnDate(selectedPackage.return_date?.slice(0, 10) ?? '');
  }, [manualDates, selectedPackage]);

  const dateRange = useMemo<DateRange | undefined>(() => {
    const from = parseYmd(expectedDepartureDate);
    const to = parseYmd(expectedReturnDate);
    return from ? { from, to } : undefined;
  }, [expectedDepartureDate, expectedReturnDate]);

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

  // ---- Load registration documents and intake data ----
  const loadRegistrationIntakeData = useCallback(async () => {
    if (!registration) return;
    // Load independently so a failure in one doesn't block the others
    try {
      const docsResult = await documentsApi.listRegistrationDocuments(
        registration.id,
        1,
        100,
      );
      setRegistrationDocuments(docsResult.data);
    } catch (err) {
      console.error('Failed to load registration documents', err);
      toast.error(
        err instanceof Error
          ? `Failed to load registration documents: ${err.message}`
          : 'Failed to load registration documents',
      );
    }
    try {
      const guaranteesResult = await api.listRegistrationGuarantees(
        registration.id,
      );
      setGuarantees(guaranteesResult);
    } catch (err) {
      console.error('Failed to load registration guarantees', err);
    }
    try {
      const financeRes = await api.getRegistrationFinanceSummary(
        registration.id,
      );
      setFinanceSummary(financeRes);
    } catch (err) {
      console.error('Failed to load registration finance', err);
    }
    try {
      const summary = await api.getRegistrationOperationalSummary(
        registration.id,
      );
      setOperationalSummary(summary);
    } catch (err) {
      console.error('Failed to load operational summary', err);
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
    if (stepIndex >= 5) {
      void loadOperationalSummary();
    }
  }, [stepIndex, loadOperationalSummary]);

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
    if (!selectedTravellerId || !selectedPackageVersionId) {
      toast.error('Select a traveler and package version');
      return;
    }
    setSubmitting(true);
    try {
      const reg = await api.createRegistration({
        traveller_id: selectedTravellerId,
        package_version_id: selectedPackageVersionId,
        expected_departure_date: expectedDepartureDate || undefined,
        expected_return_date: expectedReturnDate || undefined,
        remarks: remarks || undefined,
      });
      setRegistration(reg);
      toast.success('Registration created');
      setStepIndex(1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create registration',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Step 2: Document upload ----
  async function handleUploadDocument(
    typeId: string,
    file: File,
  ): Promise<void> {
    if (!registration || !selectedTravellerId) return;
    setUploadingType(typeId);
    try {
      const created = await documentsApi.uploadDocument({
        document_type_id: typeId,
        traveller_id: selectedTravellerId,
        registration_id: registration.id,
        file,
      });
      // Use the response directly — don't rely on a re-fetch
      setRegistrationDocuments((prev) => {
        // Replace any existing doc of the same type (for single-doc types)
        const filtered = prev.filter((d) => d.document_type?.id !== typeId);
        return [...filtered, created as unknown as DocumentListItem];
      });
      setTravellerDocuments((prev) => {
        const filtered = prev.filter((d) => d.document_type?.id !== typeId);
        return [...filtered, created as unknown as DocumentListItem];
      });
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Document upload failed',
      );
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDeleteDocument(docId: string) {
    try {
      await documentsApi.deleteDocument(docId);
      setRegistrationDocuments((prev) => prev.filter((d) => d.id !== docId));
      setTravellerDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document removed');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove document',
      );
    }
  }

  async function handleAttachExistingDocument(docId: string) {
    if (!registration) return;
    try {
      await documentsApi.attachDocumentToRegistration(docId, registration.id);
      toast.success('Document attached to registration');
      await loadRegistrationIntakeData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to attach document',
      );
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
        // 409 Conflict means the contact is already linked — that's fine
        const status = (err as { status?: number }).status;
        if (status !== 409) throw err;
      }
      setLinkedContactId(selectedContactId);
      toast.success('Emergency contact linked');
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

  // ---- Step 4: Guarantee ----
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
      await api.createRegistrationGuarantee(registration.id, input as any);
      toast.success('Guarantee created');
      await loadRegistrationIntakeData();
      setStepIndex(4);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create guarantee',
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
        line_items: [
          {
            description: `Package: ${selectedPackage.version_name}`,
            quantity: 1,
            unit_price: selectedPackage.base_price,
          },
        ],
      });
      toast.success('Invoice created');
      await loadRegistrationIntakeData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create invoice',
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
      toast.success('Payer created');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create payer',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordPayment() {
    if (!registration || !payerId || !paymentMethodId || !paymentAmount) {
      toast.error('Fill in payer, method, and amount');
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
        original_amount: Number(paymentAmount),
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
              allocated_amount: Number(paymentAmount),
            },
          ],
        });
      }
      toast.success('Payment recorded');
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
      setCompleted(true);
      toast.success(
        'Registration completed. Visa processing is now the next step.',
      );
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
  const otherTypes = documentTypes.filter(
    (t) => t.type_code !== 'PASSPORT' && t.type_code !== 'PHOTO',
  );

  // Check both registration-owned and traveller-owned documents.
  // Registration-owned is preferred, but traveller-owned is a fallback
  // because the document may have been uploaded with traveller_id only.
  const registrationDocTypeIds = new Set(
    registrationDocuments.map((d) => d.document_type?.id),
  );
  const travellerDocTypeIds = new Set(
    travellerDocuments.map((d) => d.document_type?.id),
  );

  const hasPassport = passportType
    ? registrationDocTypeIds.has(passportType.id) ||
      travellerDocTypeIds.has(passportType.id)
    : false;
  const hasPhoto = photoType
    ? registrationDocTypeIds.has(photoType.id) ||
      travellerDocTypeIds.has(photoType.id)
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
  const paymentSatisfied = hasInvoice && outstandingBalance <= 0;

  const readiness = operationalSummary?.readiness;
  const canComplete = readiness?.can_start_processing ?? false;

  const currentStep = WORKFLOW_STEPS[stepIndex];

  // ---- Step validation ----
  function canAdvance(): boolean {
    switch (currentStep.key) {
      case 'traveler':
        return (
          !!selectedTravellerId && !!selectedPackageVersionId && !submitting
        );
      case 'documents':
        return hasPassport && hasPhoto;
      case 'contact':
        return !!linkedContactId || !!selectedContactId;
      case 'guarantee':
        return hasGuarantee || canCreateGuarantee;
      case 'finance':
        return paymentSatisfied;
      case 'review':
        return canComplete;
      default:
        return true;
    }
  }

  function handleNext() {
    if (currentStep.key === 'traveler' && !registration) {
      void handleCreateRegistration();
      return;
    }
    if (currentStep.key === 'contact' && !linkedContactId) {
      void handleLinkContact();
      return;
    }
    if (currentStep.key === 'guarantee' && !hasGuarantee) {
      void handleCreateGuarantee();
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
      <div className="flex flex-wrap items-center gap-2">
        {WORKFLOW_STEPS.map((step, i) => {
          const isCurrent = i === stepIndex;
          const isPast = i < stepIndex;
          return (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isPast
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {isPast ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-sm',
                  isCurrent
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
              {i < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderTravelerStep() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select traveler</CardTitle>
            <CardDescription>
              Choose an existing traveler for this registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Traveler</Label>
              <AsyncLookupSelect
                value={selectedTravellerId}
                selectedLabel={
                  selectedTraveller
                    ? `${selectedTraveller.first_name} ${selectedTraveller.last_name} (${selectedTraveller.phone_number})`
                    : undefined
                }
                options={travellers.map((t) => ({
                  value: t.id,
                  label: `${t.first_name} ${t.last_name} (${t.phone_number})`,
                }))}
                placeholder="Search traveler by name or phone"
                onChange={(value) => setSelectedTravellerId(value)}
                onSearch={setTravellerSearch}
                loading={travellerLoading}
              />
            </div>

            {selectedTraveller && (
              <div className="rounded-md border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    {selectedTraveller.first_name} {selectedTraveller.last_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    {selectedTraveller.phone_number}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Passport:</span>{' '}
                    {selectedTraveller.passport_number ?? '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fayda:</span>{' '}
                    {selectedTraveller.fayda_number ?? '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Country:</span>{' '}
                    {selectedTraveller.country?.name ?? '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    {selectedTraveller.status?.name ?? '—'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select package version</CardTitle>
            <CardDescription>
              Choose a published and available package version.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Package version</Label>
              <LookupSelect
                value={selectedPackageVersionId}
                options={packageVersions
                  .filter((p) => p.status === 'PUBLISHED')
                  .map((p) => ({
                    value: p.id,
                    label: `${p.version_name} — ${p.package_template?.name ?? '-'} (${formatMoney(p.base_price)} ${p.currency?.code ?? ''})`,
                  }))}
                placeholder="Select published package version"
                onChange={(value) => setSelectedPackageVersionId(value)}
              />
            </div>

            {selectedPackage && (
              <div className="rounded-md border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Price:</span>{' '}
                    {formatMoney(selectedPackage.base_price)}{' '}
                    {selectedPackage.currency?.code ?? ''}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Departure:</span>{' '}
                    {selectedPackage.departure_date?.slice(0, 10) ?? '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Return:</span>{' '}
                    {selectedPackage.return_date?.slice(0, 10) ?? '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacity:</span>{' '}
                    {selectedPackage.remaining_capacity ?? '—'} remaining
                  </div>
                </div>
                {(selectedPackage.availability_blockers ?? []).length > 0 && (
                  <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                    {(selectedPackage.availability_blockers ?? []).join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Travel dates</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="manual_dates"
                    checked={manualDates}
                    onCheckedChange={(v) => setManualDates(v === true)}
                    disabled={!selectedPackage}
                  />
                  <Label htmlFor="manual_dates" className="text-sm font-normal">
                    Override package dates
                  </Label>
                </div>
              </div>
              <DateRangePicker
                value={dateRange}
                onChange={(range) => {
                  setExpectedDepartureDate(
                    range?.from ? (toYmd(range.from) ?? '') : '',
                  );
                  setExpectedReturnDate(
                    range?.to ? (toYmd(range.to) ?? '') : '',
                  );
                }}
                disabled={!manualDates || !selectedPackage}
                placeholder="Select package version to set travel dates"
              />
              <p className="text-xs text-muted-foreground">
                Travel dates are filled from the selected package version unless
                you override them.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderDocumentTypeSection(
    docType: DocumentType | undefined,
    label: string,
    isRequired: boolean,
    allowMultiple: boolean,
  ) {
    if (!docType) return null;
    const attached = registrationDocuments.filter(
      (d) => d.document_type?.id === docType.id,
    );
    // Also show traveller-owned documents of this type that aren't yet
    // linked to the registration — these count toward readiness too.
    const travellerOwned = travellerDocuments.filter(
      (d) =>
        d.document_type?.id === docType.id &&
        !registrationDocuments.some((rd) => rd.id === d.id),
    );
    const allAttached = [...attached, ...travellerOwned];

    return (
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </h4>
            {allAttached.length > 0 ? (
              <p className="text-xs text-success">
                {allAttached.length} attached
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not yet attached</p>
            )}
          </div>
          <div className="flex gap-2">
            {travellerOwned.length > 0 && (
              <LookupSelect
                value=""
                options={travellerOwned.map((d) => ({
                  value: d.id,
                  label:
                    d.display_name ?? d.original_filename ?? d.document_number,
                }))}
                placeholder="Select existing"
                onChange={(value) =>
                  value && handleAttachExistingDocument(value)
                }
                className="w-48"
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingType === docType.id}
              onClick={() => fileInputRefs.current[docType.id]?.click()}
            >
              {uploadingType === docType.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </Button>
            <input
              ref={(el) => {
                fileInputRefs.current[docType.id] = el;
              }}
              type="file"
              accept=".pdf,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadDocument(docType.id, file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {allAttached.length > 0 && (
          <ul className="space-y-1 text-sm">
            {allAttached.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded bg-muted/30 px-2 py-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="flex-1 truncate">
                  {doc.display_name ??
                    doc.original_filename ??
                    doc.document_number}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {doc.verification_status?.name ?? 'Pending'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleDeleteDocument(doc.id)}
                  aria-label="Remove document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!allowMultiple && allAttached.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Upload a new document to replace the current one. Use the trash icon
            to remove an unwanted upload.
          </p>
        )}
      </div>
    );
  }

  function renderDocumentsStep() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Registration documents</CardTitle>
            <CardDescription>
              Attach required documents for this trip. You can select an
              existing traveler document or upload a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderDocumentTypeSection(passportType, 'Passport', true, false)}
            {renderDocumentTypeSection(
              photoType,
              'Traveler Photo',
              true,
              false,
            )}

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Other Documents</h4>
              {otherTypes.map((t) =>
                renderDocumentTypeSection(t, t.name, false, true),
              )}
              {otherTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No additional document types configured.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md bg-info/10 p-3 text-sm text-info">
          <CircleAlert className="inline h-4 w-4 mr-1" />
          Newly uploaded documents are immediately available for selection
          across all steps.
        </div>
      </div>
    );
  }

  function renderContactStep() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Emergency contact</CardTitle>
            <CardDescription>
              Select an existing contact or create a new one. The contact will
              be linked as the emergency contact for this registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {linkedContactId && (
              <div className="rounded-md bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="inline h-4 w-4 mr-1" />
                Emergency contact linked successfully.
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Select existing contact
              </Label>
              <AsyncLookupSelect
                value={selectedContactId}
                selectedLabel={
                  contacts.find((c) => c.id === selectedContactId)
                    ? `${contacts.find((c) => c.id === selectedContactId)?.first_name} ${contacts.find((c) => c.id === selectedContactId)?.last_name} (${contacts.find((c) => c.id === selectedContactId)?.phone_number})`
                    : undefined
                }
                options={contacts.map((c) => ({
                  value: c.id,
                  label: `${c.first_name} ${c.last_name} (${c.phone_number})`,
                }))}
                placeholder="Search contact by name or phone"
                onChange={(value) => setSelectedContactId(value)}
                onSearch={setContactSearch}
                loading={contactLoading}
              />
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
                <p className="text-muted-foreground mb-1">Selected contact:</p>
                {(() => {
                  const c = contacts.find((x) => x.id === selectedContactId);
                  return c
                    ? `${c.first_name} ${c.last_name} — ${c.phone_number}`
                    : 'Unknown';
                })()}
              </div>
            )}
          </CardContent>
        </Card>

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

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Guarantee</CardTitle>
            <CardDescription>
              Provide a guarantee for this registration. Choose a person or a
              financial instrument.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGuarantee && (
              <div className="rounded-md bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="inline h-4 w-4 mr-1" />
                Active guarantee: {activeGuarantee.guarantee_number} (
                {activeGuarantee.guarantee_type})
              </div>
            )}

            {!activeGuarantee && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Guarantee type</Label>
                  <LookupSelect
                    value={guaranteeType}
                    options={GUARANTEE_TYPES}
                    placeholder="Select guarantee type"
                    onChange={(value) =>
                      setGuaranteeType(value as Guarantee['guarantee_type'])
                    }
                  />
                </div>

                {guaranteeType === 'PERSON' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Select contact
                    </Label>
                    <LookupSelect
                      value={guaranteeContactId}
                      options={contacts.map((c) => ({
                        value: c.id,
                        label: `${c.first_name} ${c.last_name} (${c.phone_number})`,
                      }))}
                      placeholder="Select a contact"
                      onChange={(value) => setGuaranteeContactId(value)}
                    />
                    {contacts.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No contacts loaded. Go back to the contact step to
                        create one.
                      </p>
                    )}
                  </div>
                )}

                {guaranteeType !== 'PERSON' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Amount</Label>
                      <Input
                        type="number"
                        value={guaranteeAmount}
                        onChange={(e) => setGuaranteeAmount(e.target.value)}
                        className="h-9 w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Currency</Label>
                      <LookupSelect
                        value={guaranteeCurrencyId}
                        options={currencies.map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                        placeholder="Select currency"
                        onChange={(value) => setGuaranteeCurrencyId(value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Reference number
                      </Label>
                      <Input
                        value={guaranteeReference}
                        onChange={(e) => setGuaranteeReference(e.target.value)}
                        className="h-9 w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Expiry date</Label>
                      <Input
                        type="date"
                        value={guaranteeExpiry}
                        onChange={(e) => setGuaranteeExpiry(e.target.value)}
                        className="h-9 w-full"
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
                    <div className="space-y-2 md:col-span-2">
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderFinanceStep() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Finance / Payment</CardTitle>
            <CardDescription>
              Review the financial requirement and record payment without
              leaving the workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <span className="text-muted-foreground">
                    Outstanding balance:
                  </span>
                  <span
                    className={cn(
                      'font-medium',
                      outstandingBalance > 0
                        ? 'text-destructive'
                        : 'text-success',
                    )}
                  >
                    {formatMoney(outstandingBalance)}
                  </span>
                </div>
              </div>
            )}

            {!hasInvoice && (
              <div className="space-y-3">
                <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  No invoice yet. Create one to record payment.
                </div>
                <Button
                  type="button"
                  onClick={() => void handleCreateInvoice()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  Create invoice from package price
                </Button>
              </div>
            )}

            {hasInvoice && outstandingBalance > 0 && (
              <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-medium text-sm">Record payment</h4>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payer</Label>
                  <div className="flex gap-2">
                    <LookupSelect
                      value={payerId}
                      options={payers.map((p) => ({
                        value: p.id,
                        label: `${p.contact_name ?? p.payer_number}`,
                      }))}
                      placeholder="Select payer"
                      onChange={(value) => setPayerId(value)}
                      className="flex-1"
                    />
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
                            onChange={(e) =>
                              setCustomPayerPhone(e.target.value)
                            }
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Payment method
                    </Label>
                    <LookupSelect
                      value={paymentMethodId}
                      options={paymentMethods.map((m) => ({
                        value: m.id,
                        label: m.name,
                      }))}
                      placeholder="Select method"
                      onChange={(value) => setPaymentMethodId(value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amount</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="h-9 w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Reference number
                  </Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => void handleRecordPayment()}
                  disabled={
                    submitting || !payerId || !paymentMethodId || !paymentAmount
                  }
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Record payment
                </Button>
              </div>
            )}

            {hasInvoice && outstandingBalance <= 0 && (
              <div className="rounded-md bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="inline h-4 w-4 mr-1" />
                Payment requirement satisfied. Outstanding balance is zero.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderReviewStep() {
    const items: Array<{
      label: string;
      satisfied: boolean;
      detail?: string;
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
      },
      {
        label: 'Emergency contact',
        satisfied: !!linkedContactId || !!selectedContactId,
        detail:
          linkedContactId || selectedContactId ? 'Contact linked' : 'Missing',
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
          ? 'Invoice paid in full'
          : hasInvoice
            ? `Outstanding: ${formatMoney(outstandingBalance)}`
            : 'No invoice created',
      },
    ];

    const allSatisfied = items.every((i) => i.satisfied);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Review registration intake</CardTitle>
            <CardDescription>
              Confirm all intake requirements are satisfied before completing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
                <p className="font-medium mb-1">System blockers:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {readiness.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderCompleteStep() {
    if (completed) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registration completed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-success/10 p-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
                <p className="mt-3 font-medium">
                  Registration completed successfully.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Visa processing is now the next step.
                </p>
              </div>

              {registration && (
                <div className="rounded-md border p-4 text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">
                      Registration number:
                    </span>{' '}
                    {registration.registration_number}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    PROCESSING
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {registration && (
                  <Button
                    onClick={() =>
                      navigate(`/registrations/${registration.id}`)
                    }
                  >
                    View registration
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate('/registrations')}
                >
                  Back to registrations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Complete registration</CardTitle>
            <CardDescription>
              When all intake requirements are satisfied, the system will
              transition this registration from DRAFT to PROCESSING.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canComplete && (
              <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                Not all requirements are satisfied. Go back to resolve blockers
                before completing.
              </div>
            )}

            <Button
              onClick={() => void handleCompleteRegistration()}
              disabled={!canComplete || submitting}
              className="w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Complete registration & start processing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Main render ----
  if (resuming) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading registration…
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderStepIndicator()}

      <div className="min-h-[400px]">
        {currentStep.key === 'traveler' && renderTravelerStep()}
        {currentStep.key === 'documents' && renderDocumentsStep()}
        {currentStep.key === 'contact' && renderContactStep()}
        {currentStep.key === 'guarantee' && renderGuaranteeStep()}
        {currentStep.key === 'finance' && renderFinanceStep()}
        {currentStep.key === 'review' && renderReviewStep()}
        {currentStep.key === 'complete' && renderCompleteStep()}
      </div>

      {currentStep.key !== 'complete' && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {registration && (
              <Button
                variant="ghost"
                onClick={() => navigate(`/registrations/${registration.id}`)}
              >
                Cancel & view registration
              </Button>
            )}
            <Button onClick={handleNext} disabled={!canAdvance()}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {currentStep.key === 'traveler' && !registration
                ? 'Create registration'
                : currentStep.key === 'review'
                  ? 'Proceed to complete'
                  : 'Save and continue'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
