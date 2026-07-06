import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Label,
  CardFooter,
  Separator,
} from '@kafi/ui';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Admin App | Monorepo' },
    {
      name: 'description',
      content: 'Admin application built with React Router Fullstack SSR',
    },
  ];
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
              Admin Dashboard
            </h1>
            <Badge>v8.1.0 SSR</Badge>
          </div>
          <p className="text-xl text-muted-foreground">
            React Router v8 fullstack admin app — part of the NX monorepo.
          </p>
        </div>

        <Separator />

        <section className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Shared shadcn/ui components
          </h2>
          <p className="text-muted-foreground leading-7">
            Same components from{' '}
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
              @kafi/ui
            </code>
            , different brand color — violet primary overriding the base-nova
            theme.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Violet brand via CSS variable override
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Badges</CardTitle>
              <CardDescription>User and content states</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Active</Badge>
              <Badge variant="secondary">Pending</Badge>
              <Badge variant="outline">Draft</Badge>
              <Badge variant="destructive">Suspended</Badge>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>Find and manage resources</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="search">Search users</Label>
                <Input id="search" placeholder="Search by name or email…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter">Filter by role</Label>
                <Input id="filter" placeholder="e.g. admin, editor…" />
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button>Search</Button>
              <Button variant="outline">Reset</Button>
            </CardFooter>
          </Card>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">NX Monorepo</Badge>
            <Badge variant="outline">React Router 8.1.0</Badge>
            <Badge variant="outline">SSR</Badge>
            <Badge variant="outline">Vite</Badge>
            <Badge variant="outline">Tailwind CSS v4</Badge>
            <Badge variant="outline">shadcn/ui base-nova</Badge>
            <Badge variant="outline">TypeScript</Badge>
          </div>
        </section>
      </div>
    </main>
  );
}
