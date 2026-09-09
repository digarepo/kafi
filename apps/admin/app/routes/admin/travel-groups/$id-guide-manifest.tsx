import { useParams } from 'react-router';
import { GuideManifestPage } from '@/features/travel-documents';

export function meta() {
  return [{ title: 'Guide manifest | Kafi Admin' }];
}

export default function GuideManifestRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing travel group id');
  return <GuideManifestPage groupId={id} />;
}
