/**
 * Social share URL builders for the public website.
 *
 * All builders produce properly encoded URLs for sharing content to
 * WhatsApp, Telegram, SMS, and the native Web Share API.
 */

/** Input data for building share links. */
export interface ShareData {
  /** Absolute URL of the page/content to share. */
  url: string;
  /** Title of the content being shared. */
  title: string;
  /** Optional description/summary. */
  description?: string;
}

/**
 * Builds a WhatsApp share URL.
 *
 * @example `https://wa.me/?text=Check%20out%20...`
 */
export function whatsappShareUrl({ url, title, description }: ShareData): string {
  const text = description ? `${title} — ${description} ${url}` : `${title} ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a Telegram share URL.
 *
 * @example `https://t.me/share/url?url=...&text=...`
 */
export function telegramShareUrl({ url, title, description }: ShareData): string {
  const params = new URLSearchParams({
    url,
    text: description ? `${title} — ${description}` : title,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

/**
 * Builds an SMS share link (uses `sms:` scheme with `&body=`).
 *
 * @remarks
 * The `sms:?&body=` format works on most modern mobile browsers. Some older
 * browsers use `;` instead of `&` but `&` is the modern standard.
 */
export function smsShareUrl({ url, title, description }: ShareData): string {
  const text = description ? `${title} — ${description} ${url}` : `${title} ${url}`;
  return `sms:?&body=${encodeURIComponent(text)}`;
}

/**
 * Checks whether the native Web Share API is available in the current context.
 */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Invokes the native Web Share API.
 *
 * @returns A promise that resolves to `true` if the share was successful,
 * `false` if the user cancelled, or rejects if the API is unavailable.
 */
export async function nativeShare({ url, title, description }: ShareData): Promise<boolean> {
  if (!canNativeShare()) {
    throw new Error('Web Share API not available');
  }
  try {
    await navigator.share({
      title,
      text: description,
      url,
    });
    return true;
  } catch (error) {
    // AbortError means the user cancelled — not a failure.
    if (error instanceof DOMException && error.name === 'AbortError') {
      return false;
    }
    throw error;
  }
}

/**
 * Copies a URL to the clipboard.
 *
 * @returns A promise that resolves when the copy succeeds. Rejects if the
 * clipboard API is unavailable or the copy fails.
 */
export async function copyLink(url: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('Clipboard API not available');
  }
  await navigator.clipboard.writeText(url);
}
