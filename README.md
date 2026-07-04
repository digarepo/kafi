# React Router + NestJS Monorepo Template

A modern Nx monorepo template for building full-stack applications with shared UI and shared packages.

## Stack

- **Nx** workspace
- **npm Workspaces**
- **React Router v8** (Fullstack SSR)
- **NestJS**
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (base-nova preset)
- **ESLint** (Flat Config)
- **Prettier**

---

## Repository Structure

```text
apps/
├── admin        # Admin dashboard (React Router SSR)
├── web          # Public website (React Router SSR)
└── api          # NestJS API

packages/
├── ui           # Shared UI components
├── shared-config
├── shared-types
└── shared-validation
```

---

## Requirements

- Node.js 20+
- npm 10+

---

## Installation

```bash
npm install
```

---

## Development

Start each application independently.

### Admin

```bash
nx run admin:dev
```

Runs on:

```
http://localhost:3000
```

### Public Web

```bash
nx run web:dev
```

Runs on:

```
http://localhost:3001
```

### API

```bash
nx run api:dev
```

Runs on:

```
http://localhost:4000
```

---

## Build

Build all projects.

```bash
nx run-many -t build
```

---

## Type Checking

```bash
nx run-many -t typecheck
```

---

## Lint

```bash
nx run-many -t lint
```

---

## Adding shadcn/ui Components

Components are added directly to the shared UI package.

```bash
npm run ui:add button
```

Example:

```bash
npm run ui:add dialog
npm run ui:add table
npm run ui:add dropdown-menu
```

---

## Styling

The shared UI package provides the common Tailwind and shadcn configuration.

Each frontend application defines its own theme in `app.css`, allowing different branding while reusing the same shared components.

```
packages/ui/src/styles/base.css
        ↑
apps/admin/app/app.css
apps/web/app/app.css
```

---

## Project Goals

This repository is intended to serve as a reusable foundation for future projects by providing:

- Shared UI components
- Shared TypeScript configuration
- Shared validation and types
- Server-side rendering
- Modern tooling
- Consistent project structure
- Minimal setup for new applications
