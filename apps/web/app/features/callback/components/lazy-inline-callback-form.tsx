import { lazy, Suspense } from 'react';

/**
 * Lazy-loaded wrapper for InlineCallbackForm.
 *
 * @remarks
 * The InlineCallbackForm pulls in TanStack Form, Zod schemas, Label,
 * Select, and the submit-inquiry service — none of which are needed
 * for the initial render of pages where the form is initially hidden
 * behind a toggle. By lazy-loading it, we keep those chunks out of
 * the initial bundle and only download them when the user actually
 * opens the form.
 *
 * The fallback renders null because the parent component controls
 * the toggle — the form's layout space is only needed once it's
 * actually shown.
 */
const InlineCallbackForm = lazy(() => import('./inline-callback-form'));

interface LazyInlineCallbackFormProps {
  source: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LazyInlineCallbackForm({
  source,
  onSuccess,
  onCancel,
}: LazyInlineCallbackFormProps) {
  return (
    <Suspense fallback={null}>
      <InlineCallbackForm source={source} onSuccess={onSuccess} onCancel={onCancel} />
    </Suspense>
  );
}
