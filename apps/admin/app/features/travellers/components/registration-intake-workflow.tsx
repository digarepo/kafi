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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
import {
  documentsApi,
  type DocumentListItem,
  type DocumentType,
} from '../../documents/lib/api.js';
import { ContactPersonDialog } from './contact-person-dialog';
import { FormProgress } from '../../../shared/form-progress';
import { RegistrationForm } from './registration-form';
import { DatePicker } from './date-picker';
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
  const [selectedTravellerId, setSelectedTravellerId] = useState('');
  const [selectedPackageVersionId, setSelectedPackageVersionId] = useState('');
  const [expectedDepartureDate, setExpectedDepartureDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
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

  // ---- Load registration documents and intake data ----
  const loadRegistrationIntakeData = useCallback(async () => {
    if (!registration) return;
    const results = await Promise.allSettled([
      documentsApi.listRegistrationDocuments(registration.id, 1, 100),
      api.listRegistrationGuarantees(registration.id),
      api.getRegistrationFinanceSummary(registration.id),
      api.getRegistrationOperationalSummary(registration.id),
    ]);

    const [documentsResult, guaranteesResult, financeResult, summaryResult] =
      results;
    if (documentsResult.status === 'fulfilled') {
      setRegistrationDocuments(documentsResult.value.data);
    } else {
      console.error(
        'Failed to load registration documents',
        documentsResult.reason,
      );
      toast.error('Failed to load registration documents');
    }
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
      setOperationalSummary(summaryResult.value);
    } else {
      console.error('Failed to load operational summary', summaryResult.reason);
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
        onSubmit={async (values) => {
          // In workflow mode, onSubmit is triggered by the Next button
          // via form validation. The actual API call is handled by
          // handleCreateRegistration, but if the registration already
          // exists (resume), we update it.
          if (registration) {
            await api.updateRegistration(registration.id, {
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
          setExpectedDepartureDate(values.expected_departure_date);
          setExpectedReturnDate(values.expected_return_date);
          setRemarks(values.remarks);
        }}
      />
    );
  }

  function renderDocumentTypeSection(
    docType: DocumentType | undefined,
    label: string,
    isRequired: boolean,
    _allowMultiple: boolean,
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
      <div className="rounded-lg border p-4 space-y-3">
        {/* Row 1: title + status (left), controls (right) */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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

          {/* Controls: select + upload inline on desktop, stacked on mobile */}
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-2">
            {travellerOwned.length > 0 && (
              <div className="w-40 sm:w-44">
                <Select
                  value={''}
                  onValueChange={(v) =>
                    v && handleAttachExistingDocument(v ?? '')
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue>
                      {travellerOwned
                        .map((d) => ({
                          value: d.id,
                          label:
                            d.display_name ??
                            d.original_filename ??
                            d.document_number,
                        }))
                        .find((o) => o.value === '')?.label ??
                        'Select existing'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {travellerOwned
                      .map((d) => ({
                        value: d.id,
                        label:
                          d.display_name ??
                          d.original_filename ??
                          d.document_number,
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploadingType === docType.id}
              onClick={() => fileInputRefs.current[docType.id]?.click()}
              className="h-9 w-9 shrink-0 rounded-full sm:h-8 sm:w-auto sm:rounded-md sm:px-3"
              aria-label={`Upload ${label}`}
            >
              {uploadingType === docType.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Upload</span>
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
                <button
                  type="button"
                  onClick={() => void documentsApi.viewDocument(doc.id)}
                  className="flex-1 truncate text-left text-foreground underline-offset-2 hover:underline"
                  title="Click to view document"
                >
                  {doc.display_name ??
                    doc.original_filename ??
                    doc.document_number}
                </button>
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

        {/* {!_allowMultiple && allAttached.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Upload a new document to replace the current one. Use the trash icon
            to remove an unwanted upload.
          </p>
        )} */}
      </div>
    );
  }

  function renderDocumentsStep() {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {renderDocumentTypeSection(passportType, 'Passport', true, false)}
        {renderDocumentTypeSection(photoType, 'Traveler Photo', true, false)}

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
      </div>
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
            <p className="text-muted-foreground mb-1">Selected contact:</p>
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

    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {activeGuarantee && (
          <div className="rounded-md bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="inline h-4 w-4 mr-1" />
            Active guarantee: {activeGuarantee.guarantee_number} (
            {activeGuarantee.guarantee_type})
          </div>
        )}

        {!activeGuarantee && (
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
                  />
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
          </>
        )}
      </div>
    );
  }

  function renderFinanceStep() {
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
                      {paymentMethods
                        .map((m) => ({
                          value: m.id,
                          label: m.name,
                        }))
                        .find((o) => o.value === paymentMethodId)?.label ??
                        'Select method'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods
                      .map((m) => ({
                        value: m.id,
                        label: m.name,
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
                <Label className="text-sm font-medium">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-9 w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Reference number</Label>
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
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isReview ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {isReview ? 'Register' : 'Next'}
        </Button>
      </div>
    );
  }

  const stepTitles: Record<string, string> = {
    traveler: 'Traveler & package',
    documents: 'Travel documents',
    contact: 'Emergency contact',
    guarantee: 'Guarantee',
    finance: 'Payment',
    review: 'Review',
  };

  const stepsInCard =
    currentStep.key === 'traveler' ||
    currentStep.key === 'documents' ||
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
            {currentStep.key === 'documents' && renderDocumentsStep()}
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
