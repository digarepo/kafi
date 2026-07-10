import type { Route } from './+types/home';
import { Hero } from '@/features/home/components/Hero';
import {
  CTA,
  Destinations,
  Features,
  Partners,
  Pricing,
} from '@/features/home/components/Features';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Web App | Monorepo' },
    {
      name: 'description',
      content: 'Web application built with React Router Fullstack SSR',
    },
  ];
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background py-12">
      <Hero />
      <Partners />
      <Destinations />
      <Features />
      <Pricing />
      <CTA />
    </main>
  );
}
