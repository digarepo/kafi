import { useState } from 'react';
import {
  WhatsappLogo,
  TelegramLogo,
  ChatCircleIcon,
  ShareNetworkIcon,
  LinkIcon,
  CheckIcon,
} from '@phosphor-icons/react';

import { Button } from '@ui/components/ui/button';
import {
  canNativeShare,
  copyLink,
  nativeShare,
  smsShareUrl,
  telegramShareUrl,
  whatsappShareUrl,
  type ShareData,
} from '@/lib/share-links';
import { trackEvent, trackServerEvent } from '@/lib/analytics';
import { getAttributionWithVisitor } from '@/lib/attribution';

/**
 * Props for the ShareBar component.
 */
export interface ShareBarProps extends ShareData {
  /** Content type being shared (e.g. "package", "service"). */
  contentType: string;
  /** Optional content ID (e.g. package slug). */
  contentId?: string;
  /** Optional className for custom styling. */
  className?: string;
}

/**
 * Records a share event to both Plausible and the first-party analytics table.
 *
 * @param channel - The share channel used (whatsapp, telegram, sms, native, copy).
 * @param contentType - The type of content being shared.
 * @param contentId - The ID of the content being shared.
 */
function recordShare(
  channel: string,
  contentType: string,
  contentId?: string,
): void {
  // Plausible custom event (aggregate analytics).
  trackEvent('share', { channel, content_type: contentType, content_id: contentId ?? null });

  // First-party analytics event (owned, queryable).
  const attribution = getAttributionWithVisitor();
  void trackServerEvent(
    'share',
    { channel, content_type: contentType, content_id: contentId ?? null },
    attribution,
  );
}

/**
 * A reusable sharing component with WhatsApp, Telegram, SMS, native share,
 * and copy-link buttons.
 *
 * @remarks
 * - Share events are tracked only on successful completion:
 *   - Copy-link: only after the clipboard write succeeds.
 *   - Native share: only when the share API resolves successfully (not on
 *     cancellation).
 *   - WhatsApp/Telegram/SMS: on click (opening the share URL is the success
 *     signal — these platforms don't provide callbacks).
 */
export function ShareBar({
  url,
  title,
  description,
  contentType,
  contentId,
  className,
}: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyLink(url);
      setCopied(true);
      recordShare('copy', contentType, contentId);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  };

  const handleNativeShare = async () => {
    try {
      const success = await nativeShare({ url, title, description });
      if (success) {
        recordShare('native', contentType, contentId);
      }
      // Cancellation (success === false) is not tracked as a share.
    } catch {
      // Native share failed — silently ignore.
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <a
        href={whatsappShareUrl({ url, title, description })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        onClick={() => recordShare('whatsapp', contentType, contentId)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
      >
        <WhatsappLogo className="h-4 w-4" weight="fill" />
      </a>

      <a
        href={telegramShareUrl({ url, title, description })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Telegram"
        onClick={() => recordShare('telegram', contentType, contentId)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
      >
        <TelegramLogo className="h-4 w-4" weight="fill" />
      </a>

      <a
        href={smsShareUrl({ url, title, description })}
        aria-label="Share via SMS"
        onClick={() => recordShare('sms', contentType, contentId)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
      >
        <ChatCircleIcon className="h-4 w-4" />
      </a>

      {canNativeShare() && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Share via device sharing"
          onClick={handleNativeShare}
          className="h-9 w-9 rounded-full border-border/40 bg-card text-muted-foreground hover:border-accent/40 hover:text-accent"
        >
          <ShareNetworkIcon className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        aria-label="Copy link"
        onClick={handleCopy}
        className="h-9 w-9 rounded-full border-border/40 bg-card text-muted-foreground hover:border-accent/40 hover:text-accent"
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-accent" weight="bold" />
        ) : (
          <LinkIcon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
