/**
 * Public exports for the callback request feature.
 *
 * @remarks
 * InlineCallbackForm is intentionally NOT re-exported here to prevent Zod
 * and TanStack Form from being bundled into the main chunk. Import it directly:
 *   import InlineCallbackForm from '@/features/callback/components/inline-callback-form';
 */
export { default as CallbackPage } from './components/callbackPage';
export { default as CallbackForm } from './components/callback-form';
