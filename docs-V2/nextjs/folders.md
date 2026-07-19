# Folders (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/folders.md` |
| Authority | **Scratch** — nextjs skill + disk `apps/web/**` |
| Updated | 2026-07-19 |

---

## L1 homes (`apps/web`)

| L1 | Purpose | Rule |
|----|---------|------|
| `app/` | Pages, layouts, `actions/`, `api/` | Thin only |
| `features/` | Product UI | Screens live here |
| `modules/` | Domain + schemas | No Request/cookies in domain |
| `proxy.ts` | Session redirect | Not `middleware.ts` |
| `public/` | Static assets | Product art only |
| `@afenda/ui-system` | UI primitives + tokens | Flat barrel + `styles.css` |

### Route groups (no URL segment)

| Group | Use |
|-------|-----|
| `app/(public)/` | Landing, auth, join, 403 |
| `app/(client)/` | Client gate + workspace |
| `app/(operator)/` | `/admin` |

---

## Bans

| Ban | Why |
|-----|-----|
| Repo-root `app/` · `features/` · `modules/` · `components-V2/` | Absent by design — do not recover |
| `middleware.ts` | Use `proxy.ts` |
| Fat `page.tsx` | UI in `features/*` |
| Root `components/` dump · banished `lib/` growth | Wrong homes |
| Storybook · `/playground` prod routes | Retired / absent |
| `modules/declarations` · `modules/fft` · `/fft` product | Nuclear wipe — removed |
| Product-import of `shadcn-studio/` scratch | Promote then prune |
| Bypass `@afenda/ui-system` | Barrel only |
| `any` / unearned `as` in product paths | Validate at boundary |
| Tutorial `{ success, data }` envelopes | Use `ActionResult` |

---

## Thin page contract

```text
page.tsx  →  await params/searchParams  →  modules/* or feature runner
          →  render feature shell
          →  Server Actions for mutations
```

## Verify

```text
Test-Path apps/web/proxy.ts; Get-ChildItem apps/web/modules, apps/web/features -Directory
```
