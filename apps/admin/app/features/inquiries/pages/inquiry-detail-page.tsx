import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Archive, ArrowLeft, CheckCircle2, Phone, Save } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { formatPhone } from '../../../shared/format';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import { displayDate } from '../../operations/lib/date';
import {
  api,
  type Inquiry,
  type InquiryStatus,
  type InquiryType,
} from '../../../lib/api.js';

interface InquiryDetailPageProps {
  id: string;
}

const TYPE_LABELS: Record<InquiryType, string> = {
  BOOKING: 'Booking request',
  CALLBACK: 'Callback request',
  CONTACT: 'Contact message',
  ENQUIRY: 'General enquiry',
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  RESOLVED: 'Resolved',
};

const STATUS_VARIANT: Record<
  InquiryStatus,
  'default' | 'secondary' | 'outline'
> = {
  NEW: 'default',
  CONTACTED: 'secondary',
  RESOLVED: 'outline',
};

/**
 * Returns the next status a staff member may transition this inquiry into, or
 * `null` when the inquiry is terminal.
 */
function nextStatus(current: InquiryStatus): 'CONTACTED' | 'RESOLVED' | null {
  if (current === 'NEW') return 'CONTACTED';
  if (current === 'CONTACTED') return 'RESOLVED';
  return null;
}

export function InquiryDetailPage({ id }: InquiryDetailPageProps) {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const row = await api.getInquiry(id);
        if (!cancelled) {
          setInquiry(row);
          setNotes(row.staff_notes ?? '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Inquiry not found');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canManage = can('INQUIRY_MANAGE');

  async function handleSaveNotes() {
    if (!inquiry) return;
    setSavingNotes(true);
    try {
      const updated = await api.updateInquiry(inquiry.id, {
        staff_notes: notes.trim() || null,
      });
      setInquiry(updated);
      toast.success('Notes saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save notes');
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleAdvanceStatus() {
    if (!inquiry) return;
    const next = nextStatus(inquiry.inquiry_status);
    if (!next) return;
    setTransitioning(true);
    try {
      const updated = await api.changeInquiryStatus(inquiry.id, {
        status: next,
      });
      setInquiry(updated);
      toast.success(`Marked as ${STATUS_LABELS[next]}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not update status',
      );
    } finally {
      setTransitioning(false);
    }
  }

  async function handleResolve() {
    if (!inquiry) return;
    setTransitioning(true);
    try {
      const updated = await api.changeInquiryStatus(inquiry.id, {
        status: 'RESOLVED',
      });
      setInquiry(updated);
      toast.success('Marked as Resolved');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not update status',
      );
    } finally {
      setTransitioning(false);
    }
  }

  async function handleArchive() {
    if (!inquiry) return;
    if (
      !(await confirm({
        title: 'Archive inquiry?',
        description:
          'It will be removed from the inbox and can be restored later.',
        confirmLabel: 'Archive',
      }))
    ) {
      return;
    }
    setArchiving(true);
    try {
      await api.archiveInquiry(inquiry.id);
      toast.success('Inquiry archived');
      navigate('/inquiries');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="text-sm text-muted-foreground">Loading inquiry…</div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? 'Inquiry not found'}
        </div>
      </div>
    );
  }

  const next = nextStatus(inquiry.inquiry_status);
  const canResolve = inquiry.inquiry_status !== 'RESOLVED';

  return (
    <div className="space-y-5">
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {inquiry.inquiry_number}
            </h1>
            <Badge variant={STATUS_VARIANT[inquiry.inquiry_status]}>
              {STATUS_LABELS[inquiry.inquiry_status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {TYPE_LABELS[inquiry.inquiry_type]} · received{' '}
            {displayDate(inquiry.created_at)}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {next && (
              <Button
                onClick={() => void handleAdvanceStatus()}
                disabled={transitioning}
              >
                Mark as {STATUS_LABELS[next]}
              </Button>
            )}
            {canResolve && next !== 'RESOLVED' && (
              <Button
                variant="secondary"
                onClick={() => void handleResolve()}
                disabled={transitioning}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Resolve
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => void handleArchive()}
              disabled={archiving}
            >
              <Archive className="mr-1.5 h-4 w-4" />
              Archive
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Message">
              <p className="whitespace-pre-wrap text-sm">
                {inquiry.message ?? '—'}
              </p>
            </DetailRow>
            {(inquiry.package_interest ||
              inquiry.service_interest ||
              inquiry.travel_period ||
              inquiry.group_size ||
              inquiry.enquiry_category ||
              inquiry.source_channel) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {inquiry.enquiry_category && (
                  <DetailRow label="Category">
                    {inquiry.enquiry_category}
                  </DetailRow>
                )}
                {inquiry.package_interest && (
                  <DetailRow label="Package interest">
                    {inquiry.package_interest}
                  </DetailRow>
                )}
                {inquiry.service_interest && (
                  <DetailRow label="Service interest">
                    {inquiry.service_interest}
                  </DetailRow>
                )}
                {inquiry.travel_period && (
                  <DetailRow label="Travel period">
                    {inquiry.travel_period}
                  </DetailRow>
                )}
                {inquiry.group_size && (
                  <DetailRow label="Group size">{inquiry.group_size}</DetailRow>
                )}
                {inquiry.source_channel && (
                  <DetailRow label="Source">{inquiry.source_channel}</DetailRow>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Name">{inquiry.full_name ?? '—'}</DetailRow>
            <DetailRow label="Phone">
              <a
                href={`tel:${inquiry.phone_number}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {formatPhone(inquiry.phone_number)}
              </a>
            </DetailRow>
            {inquiry.email_address && (
              <DetailRow label="Email">
                <a
                  href={`mailto:${inquiry.email_address}`}
                  className="text-sm text-primary hover:underline"
                >
                  {inquiry.email_address}
                </a>
              </DetailRow>
            )}
            <DetailRow label="Received">
              {displayDate(inquiry.created_at)}
            </DetailRow>
            {inquiry.contacted_at && (
              <DetailRow label="Contacted at">
                {displayDate(inquiry.contacted_at)}
              </DetailRow>
            )}
            {inquiry.resolved_at && (
              <DetailRow label="Resolved at">
                {displayDate(inquiry.resolved_at)}
              </DetailRow>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Staff notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add internal notes visible only to staff…"
              rows={5}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => void handleSaveNotes()}
                disabled={savingNotes}
              >
                <Save className="mr-1.5 h-4 w-4" />
                Save notes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/inquiries"
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="mr-1.5 h-4 w-4" />
      Back to inbox
    </Link>
  );
}

interface DetailRowProps {
  label: string;
  children: React.ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
