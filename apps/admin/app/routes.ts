import type { RouteConfig } from '@react-router/dev/routes';
import { index, layout, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  route('forgot-password', 'routes/forgot-password.tsx'),
  route('reset-password', 'routes/reset-password.tsx'),
  route('verify-email', 'routes/verify-email.tsx'),
  route('change-password', 'routes/change-password.tsx'),
  layout('routes/admin.tsx', [
    index('routes/home.tsx'),
    route('users', 'routes/admin/users.tsx'),
    route('packages', 'routes/admin/packages.tsx'),
    route('travellers', 'routes/admin/travellers.tsx', [
      index('routes/admin/travellers/index.tsx'),
      route('new', 'routes/admin/travellers/new.tsx'),
      route(':id', 'routes/admin/travellers/$id.tsx'),
      route(':id/edit', 'routes/admin/travellers/$id-edit.tsx'),
    ]),
    route('contact-persons', 'routes/admin/contact-persons.tsx', [
      index('routes/admin/contact-persons/index.tsx'),
      route('new', 'routes/admin/contact-persons/new.tsx'),
      route(':id', 'routes/admin/contact-persons/$id.tsx'),
      route(':id/edit', 'routes/admin/contact-persons/$id-edit.tsx'),
    ]),
    route('registrations', 'routes/admin/registrations.tsx', [
      index('routes/admin/registrations/index.tsx'),
      route('new', 'routes/admin/registrations/new.tsx'),
      route(':id', 'routes/admin/registrations/$id.tsx'),
      route(':id/edit', 'routes/admin/registrations/$id-edit.tsx'),
    ]),
    route('invoices', 'routes/admin/invoices.tsx', [
      index('routes/admin/invoices/index.tsx'),
      route('new', 'routes/admin/invoices/new.tsx'),
      route(':id', 'routes/admin/invoices/$id.tsx'),
    ]),
    route('payments', 'routes/admin/payments.tsx', [
      index('routes/admin/payments/index.tsx'),
      route('new', 'routes/admin/payments/new.tsx'),
      route(':id', 'routes/admin/payments/$id.tsx'),
    ]),
    route('payers', 'routes/admin/payers.tsx'),
    route('payment-methods', 'routes/admin/payment-methods.tsx'),
    route('roles', 'routes/admin/roles.tsx'),
    route('profile', 'routes/profile.tsx'),
  ]),
  route('*', 'not-found.tsx'),
] satisfies RouteConfig;
