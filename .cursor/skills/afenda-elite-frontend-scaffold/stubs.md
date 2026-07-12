# Scaffold stub templates (Next.js best practice)

Copy these shapes when generating the greenfield tree. No domain imports.

## Root layout

```tsx
import type { ReactNode } from 'react'
import './globals.css' // keep existing global CSS entry if present

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

## Segment layout (no html/body)

```tsx
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return <div data-segment="dashboard">{children}</div>
}
```

## Static page stub

```tsx
export default function Page() {
  return (
    <main>
      <h1>Dashboard</h1>
    </main>
  )
}
```

## Dynamic page stub (async params)

```tsx
type Props = {
  params: Promise<{ declarationId: string }>
}

export default async function Page({ params }: Props) {
  const { declarationId } = await params
  return (
    <main>
      <h1>Declaration</h1>
      <p>{declarationId}</p>
    </main>
  )
}
```

## Join page (searchParams)

```tsx
type Props = {
  searchParams: Promise<{ invitationId?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { invitationId } = await searchParams
  return (
    <main>
      <h1>Join</h1>
      <p>{invitationId ?? '(no invitationId)'}</p>
    </main>
  )
}
```

## Trade nested params

```tsx
type Props = {
  params: Promise<{ locale: string; eventId: string }>
}

export default async function Page({ params }: Props) {
  const { locale, eventId } = await params
  return (
    <main>
      <h1>Event setup</h1>
      <p>
        {locale} / {eventId}
      </p>
    </main>
  )
}
```

## loading.tsx

```tsx
export default function Loading() {
  return <p>Loading…</p>
}
```

## error.tsx (must be client)

```tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
```

## global-error.tsx (must be client + html/body)

```tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  )
}
```

## not-found.tsx

```tsx
export default function NotFound() {
  return (
    <main>
      <h2>Not found</h2>
    </main>
  )
}
```

## Optional generateMetadata (scaffold may omit)

```tsx
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug }
}
```

Do **not** fetch domain data inside `generateMetadata` during scaffold.

## Boundary note

Stub `Props` field names must match [boundaries.md](boundaries.md) (`declarationId`, `assignmentId`, …). During wire, parse with Zod then brand — never pass raw unvalidated strings into module ports.
