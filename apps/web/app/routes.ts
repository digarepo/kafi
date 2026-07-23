import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('packages', 'routes/packages.tsx'),
  route('packages/:slug', 'routes/package-detail.tsx'),

  route('services', 'routes/services.tsx'),
  route('services/:slug', 'routes/service-detail.tsx'),

  route('contact', 'routes/contact.tsx'),

  route('booking', 'routes/booking.tsx'),
  route('callback', 'routes/callback.tsx'),
  route('enquiry', 'routes/enquiry.tsx'),

  route('about', 'routes/about.tsx'),

  route('faq', 'routes/faq.tsx'),

  route('privacy', 'routes/privacy.tsx'),
  route('tos', 'routes/tos.tsx'),

  route('*', 'not-found.tsx'),
] satisfies RouteConfig;
