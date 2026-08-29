import type { Route } from './+types/callback';
import { CallbackPage } from '@/features/callback';
import { buildOgMeta } from '@/lib/og';

export function meta({}: Route.MetaArgs) {
  const title = 'Request a Callback | Kafi Tours';
  const description =
    'Request a callback from Kafi Tours. A representative will contact you to answer your questions or guide you through the booking process.';
  const url = 'https://kafitour.com/callback';
  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

export default function CallbackRoute() {
  return <CallbackPage />;
}
