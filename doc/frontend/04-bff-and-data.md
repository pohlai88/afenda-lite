# BFF and data flow

## Next.js data-pattern decision tree (mandatory)

```text
Need data?
├── Server Component read?     → lib/domain (or page runner) directly
├── Client mutation?           → Server Action ('use server')
├── Client read that cannot be passed from parent?
│     → prefer lift fetch to Server parent; else Route Handler
├── Webhook / third-party HTTP / health / auth proxy / autosave XHR?
│     → Route Handler under app/api/**
└── External/mobile REST consumer?
      → Route Handler implementing doc/api REST contract
```

### Anti-patterns (forbidden)

| Anti-pattern | Why |
|--------------|-----|
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; secrets already on server; duplicates domain |
| Fat `page.tsx` with SQL | Breaks layering; untestable |
| `page.tsx` + `route.ts` in same folder | Next.js conflict |
| Validation deep inside domain for already-parsed input | Validate once at adapter edge |
| Mixing Action return shapes (sometimes throw, sometimes `{ error }`) | Unpredictable clients — align with [../api/03-error-contract.md](../api/03-error-contract.md) codes |

## Vertical slice (one feature)

```text
app/**/page.tsx          → await params; call runner
lib/pages/* or lib/entry/* → session + load model
features/* or portal-views → present UI (RSC + small client islands)
app/actions/*.ts         → 'use server'; Zod; requireSession; domain; revalidatePath
lib/schemas/*.ts         → boundary schemas
lib/domain/*.ts          → parameterized queries only
```

### Reads

```tsx
// page.tsx (Server Component) — preferred
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const model = await loadDeclarationPage(id) // → lib/domain
  return <DeclarationView model={model} />
}
```

### Mutations

```tsx
// app/actions/declarations.ts
'use server'
export async function updateDeclarationAction(input: unknown) {
  const parsed = parseSchema(updateSurveySchema, input)
  if (!parsed.success) return { ok: false as const, code: 'VALIDATION_ERROR', message: parsed.error }
  await requireAdminSession()
  await domainUpdate(...)
  revalidatePath('/dashboard')
  return { ok: true as const }
}
```

### Route Handlers (HTTP only)

Use when the browser (or probe) must speak HTTP:

- Health probes  
- Neon Auth catch-all  
- Declaration draft autosave (frequent XHR)  
- Future external REST consumers (implement contract in `doc/api`)

Shared path: Zod → domain — same as Actions.

## Waterfalls

- Prefer `Promise.all` for independent domain loads in page runners  
- Use `loading.tsx` (Suspense) per segment — do not block the whole shell on one slow query when children can stream  
- Pass serializable props into client islands; do not pass functions/classes from Server → Client (except Server Actions)

## Related

- [01-architecture.md](01-architecture.md)  
- [07-nextjs-conventions.md](07-nextjs-conventions.md)  
- [../api/01-boundaries.md](../api/01-boundaries.md)  
- [../api/02-rest-resources.md](../api/02-rest-resources.md)  
