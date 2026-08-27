import { useParams } from 'react-router';
import { InquiryDetailPage } from '@/features/inquiries';

export function meta() {
  return [{ title: 'Inquiry detail | Kafi Admin' }];
}

export default function InquiryDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing inquiry id');
  return <InquiryDetailPage id={id} />;
}
