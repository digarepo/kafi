import { InquiryListPage } from '@/features/inquiries';

export function meta() {
  return [{ title: 'Inquiry inbox | Kafi Admin' }];
}

export default function InquiriesIndexRoute() {
  return <InquiryListPage />;
}
