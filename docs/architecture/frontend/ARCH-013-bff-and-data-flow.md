# ARCH-013 BFF and Data Flow

| Field | Value |
|-------|-------|
| ID | ARCH-013 |
| Category | Architecture |
| Version | 1.0.1 |
| Status | Living |
| Control State | Closed |
| Owner | Frontend |
| Updated | 2026-07-14 |
## Next.js data-pattern decision tree (mandatory)

**SSOT** for this tree — every other doc links here; do not paste a second copy.

```text
Need data?
├── Server Component read?     → modules/*/domain (or page runner) directly
├── Client mutation?           → Server Action ('use server')
├── Client read that cannot be passed from parent?
│     → prefer lift fetch to Server parent; else Route Handler
├── Webhook / third-party HTTP / health / auth proxy / autosave XHR?
│     → Route Handler under app/api/**
└── External/mobile REST consumer?
      → Route Handler implementing docs/api REST contract
```

### Anti-patterns (forbidden)

| Anti-pattern | Why |
|--------------|-----|
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; secrets already on server; duplicates domain |
| Fat `page.tsx` with SQL | Breaks layering; untestable |
| `page.tsx` + `route.ts` in same folder | Next.js conflict |
| Validation deep inside domain for already-parsed input | Validate once at adapter edge |
| Mixing Action return shapes (sometimes throw, sometimes `{ error }`) | Unpredictable clients — align with [../api/API-002-error-contract.md](../../api/API-002-error-contract.md) codes |

## Vertical slice (one feature)

```text
app/**/page.tsx          → await params; call runner
features/organization-admin/* or features/auth/entry/* → session + load model (product runners)
features/* or portal-views → present UI (RSC + small client islands)
app/actions/*.ts         → 'use server'; Zod; requireSession; module domain; revalidatePath
modules/*/schemas/*.ts   → boundary schemas (owning context)
modules/*/domain/*.ts    → parameterized queries only
```

### Reads

```tsx
// page.tsx (Server Component) — preferred
export default async function Page({ params }: { params: Promise<{ declarationId: string }> }) {
  const { declarationId } = await params
  const model = await loadDeclarationPage(declarationId) // → modules/declarations/domain
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
- Future external REST consumers (implement contract in `docs/api`)

Shared path: Zod → module domain — same as Actions.

## Waterfalls

- Prefer `Promise.all` for independent domain loads in page runners  
- Use `loading.tsx` (Suspense) per segment — do not block the whole shell on one slow query when children can stream  
- Pass serializable props into client islands; do not pass functions/classes from Server → Client (except Server Actions)

## Related

- [01-architecture.md](ARCH-002-frontend-architecture.md)  
- [07-nextjs-conventions.md](ARCH-016-next-js-conventions.md)  
- [../api/API-001-api-boundaries.md](../../api/API-001-api-boundaries.md)  
- [../api/REST-001-rest-resources.md](../../api/REST-001-rest-resources.md)  
- [../backend/ARCH-004-backend-layers.md](../backend/ARCH-004-backend-layers.md)  
