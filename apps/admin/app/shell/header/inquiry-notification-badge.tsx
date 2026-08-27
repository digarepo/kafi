import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Inbox } from 'lucide-react';
import { cn } from '@kafi/ui';

import { usePermissions } from '../../core/permissions';
import { api, type InquirySummary } from '../../lib/api.js';

/**
 * Inquiry notification badge for the top bar.
 *
 * Polls the inquiry summary endpoint on a fixed interval and surfaces a count
 * of new (unopened) inquiries as a badge on an inbox icon. Clicking navigates
 * to the inquiry inbox.
 *
 * @remarks
 * - Only renders when the user has `INQUIRY_VIEW`.
 * - Polling pauses when the tab is hidden and resumes on focus, so background
 *   tabs do not generate unnecessary requests.
 * - The count resets visually once the user navigates to the inbox (the list
 *   page's own data load is the source of truth there).
 */

const POLL_INTERVAL_MS = 60_000;

export function InquiryNotificationBadge() {
  const { can } = usePermissions();
  const [summary, setSummary] = useState<InquirySummary | null>(null);
  const [visible, setVisible] = useState(false);

  const canViewInquiries = can('INQUIRY_VIEW');

  useEffect(() => {
    if (!canViewInquiries) return;

    let cancelled = false;

    async function loadSummary() {
      try {
        const result = await api.getInquirySummary();
        if (!cancelled) {
          setSummary(result);
          setVisible(true);
        }
      } catch {
        // Silently ignore — the badge is non-critical and should never
        // surface errors to the user.
        if (!cancelled) setVisible(false);
      }
    }

    void loadSummary();

    const interval = setInterval(() => {
      if (!document.hidden) void loadSummary();
    }, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (!document.hidden) void loadSummary();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [canViewInquiries]);

  if (!canViewInquiries || !visible || !summary) {
    return null;
  }

  const unviewedCount = summary.unviewed;
  if (unviewedCount === 0) {
    return (
      <Link
        to="/inquiries"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
        aria-label="Inquiry inbox — no new inquiries"
      >
        <Inbox className="h-5 w-5" />
      </Link>
    );
  }

  const displayCount = unviewedCount > 99 ? '99+' : String(unviewedCount);

  return (
    <Link
      to="/inquiries"
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
      aria-label={`${unviewedCount} new inquiry${unviewedCount === 1 ? '' : 's'}`}
    >
      <Inbox className="h-5 w-5" />
      <span
        className={cn(
          'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground',
        )}
      >
        {displayCount}
      </span>
    </Link>
  );
}
