import type { Route } from './+types/enquiry';
import { EnquiryPage } from '@/features/enquiry';
import { buildOgMeta } from '@/lib/og';

export function meta({}: Route.MetaArgs) {
  const title = 'Enquiry | Kafi Tours';
  const description =
    'Send an enquiry to Kafi Tours about packages, services, or custom travel plans. A travel coordinator will respond shortly.';
  const url = 'https://kafitour.com/enquiry';
  return [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'noindex, follow' },
    { tagName: 'link', rel: 'canonical', href: url },
    ...buildOgMeta({ title, description, url }),
  ];
}

export default function EnquiryRoute() {
  return <EnquiryPage />;
}
