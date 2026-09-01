import type { Route } from './+types/contact';
import { ContactPage } from '@/features/contact';
import { buildOgMeta } from '@/lib/og';

export function meta({}: Route.MetaArgs) {
  const title = 'Contact | Kafi Tours';
  const description =
    'Contact Kafi Tours to plan your Umrah or travel journey. Call, WhatsApp, or send an enquiry and a travel coordinator will respond personally.';
  const url = 'https://kafitour.com/contact';

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

export default function ContactRoute() {
  return <ContactPage />;
}
