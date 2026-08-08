import { FileText, Plane } from 'lucide-react';
import type { RouteMeta } from '../../shell/routing';

export const documentsMeta: RouteMeta[] = [
  {
    path: '/documents',
    title: 'Documents',
    navigation: {
      label: 'Documents',
      icon: FileText,
      order: 45,
      group: 'Documents',
    },
    breadcrumb: { label: 'Documents' },
    permission: 'DOCUMENT_VIEW',
  },
  {
    path: '/documents/new',
    title: 'Upload document',
    breadcrumb: { label: 'Upload' },
    permission: 'DOCUMENT_MANAGE',
    navigation: { label: 'Upload', parent: '/documents', hidden: true },
  },
  {
    path: '/documents/:id',
    title: 'Document detail',
    breadcrumb: { label: 'Detail' },
    permission: 'DOCUMENT_VIEW',
    navigation: { label: 'Detail', parent: '/documents', hidden: true },
  },
  {
    path: '/visa-applications',
    title: 'Visa applications',
    navigation: {
      label: 'Visa applications',
      icon: Plane,
      order: 46,
      group: 'Documents',
    },
    breadcrumb: { label: 'Visa applications' },
    permission: 'VISA_VIEW',
  },
  {
    path: '/visa-applications/new',
    title: 'Create visa application',
    breadcrumb: { label: 'Create' },
    permission: 'VISA_MANAGE',
    navigation: { label: 'Create', parent: '/visa-applications', hidden: true },
  },
  {
    path: '/visa-applications/:id',
    title: 'Visa application detail',
    breadcrumb: { label: 'Detail' },
    permission: 'VISA_VIEW',
    navigation: { label: 'Detail', parent: '/visa-applications', hidden: true },
  },
];
