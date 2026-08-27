import type { Route } from './+types/contact';
import { ContactPage } from '@/features/contact';

export function meta({}: Route.MetaArgs) {
  const title = 'Contact | Kafi Tours';
  const description =
    'Contact Kafi Tours to plan your Umrah or pilgrimage journey. Call, WhatsApp, or send an enquiry and a travel coordinator will respond personally.';
  const url = 'https://kafitour.com/contact';

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
}

export default function ContactRoute() {
  return <ContactPage />;
}
