import type { Route } from './+types/contact';
import { ContactPage } from '@/features/contact';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Contact Kafi Tours' },
    {
      name: 'description',
      content: 'Contact Kafi Tours to plan your Umrah or pilgrimage journey.',
    },
  ];
}

export default function ContactRoute() {
  return <ContactPage />;
}
