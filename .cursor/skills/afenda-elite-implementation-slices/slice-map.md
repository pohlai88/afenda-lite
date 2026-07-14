# ARCH-028 — slice map (farms · authority · verify)

Authority body: [ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md).  
Always also load: this skill’s [SKILL.md](SKILL.md).

**Progress hint (checkout):** S1.1–S7.2 + Checkpoints A–E done. Next open: **S7.3**. Re-read ARCH-028 checkboxes before starting — evidence on disk wins over this hint.

## Farm short names

| Short | Skill path |
|-------|------------|
| router | `using-afenda-elite-skills` |
| slices | `afenda-elite-implementation-slices` (this farm) |
| scaffold | `afenda-elite-frontend-scaffold` |
| nextjs | `afenda-elite-nextjs-best-practice` |
| modules | `afenda-elite-backend-modules` |
| api | `afenda-elite-api-contract` |
| refactor | `afenda-elite-monorepo-refactor` |
| neon | `neon-tenancy-efficiency` |
| admincn | `admincn-customization` |
| lanes | `bounded-agent-lanes` (method) |

## Slice table

| Slice | Size | Primary path | Sibling ARCH | LOAD farms (order) | Verify (minimum) |
|-------|------|--------------|--------------|--------------------|------------------|
| S1.1 | S | root workspace · `apps/web` · Turbo | ARCH-022 | router → slices → refactor | `pnpm install` · `turbo run build --dry=json` |
| S1.2 | S | `packages/config` | ARCH-022 · ARCH-024 | router → slices → refactor | package listed in workspace · extends resolve |
| **Checkpoint A** | — | workspace graph | ARCH-024 | slices | no circular workspace deps |
| S2.1 | M | `packages/db` schema | ARCH-025 · ARCH-023 | router → slices → neon → modules | `pnpm --filter @afenda/db typecheck` · `organization_id` NOT NULL |
| S2.2 | M | `packages/db` client · drizzle | ARCH-025 | router → slices → neon → modules | `db:generate` · `db:check` · **no** baseline migrate on prod branch |
| **Checkpoint B** | — | DB import boundary | ARCH-025 | slices | no app `pg` · imports via `@afenda/db` |
| S3.1 | S | `packages/auth` session | ARCH-026 | router → slices → neon → nextjs | `getSession()` → `Promise<Session>` (never silent null) · typecheck package |
| S3.2 | S | `packages/auth` RBAC · invitations | ARCH-026 · ARCH-023 | router → slices → neon → nextjs | wrong role → `/403` · unauth → `/auth/login` · Neon SDK only in `@afenda/auth` |
| **Checkpoint C** | — | auth import boundary | ARCH-026 | slices | no Neon Auth imports outside `@afenda/auth` · `rg "neon-auth-request" apps/web/` = 0 after move |
| S4.1 | S | `packages/env` | ARCH-027 | router → slices → nextjs | typed `import { env } from '@afenda/env'` · compose retired same change set |
| **Checkpoint D** | — | env file model | ARCH-027 | slices | `.env.local` only for Next · compose scripts gone · AGENTS.md matches Target |
| S5.1 | M | `packages/ui` | ARCH-024 · ARCH-015 | router → slices → scaffold → admincn | `import { Button } from '@afenda/ui'` · globals from package · no duplicate `apps/web/components/ui` |
| **Checkpoint E** | — | UI import boundary | ARCH-024 | slices | `rg "from.*components/ui" apps/web/` = 0 |
| S6.1 | S | `packages/emails` | ARCH-026 | router → slices → nextjs | `pnpm --filter @afenda/emails email:dev` previews |
| S7.1 | S/L | `apps/web` Next scaffold | ARCH-017 · ARCH-016 · ARCH-022 | router → slices → scaffold → nextjs | `pnpm --filter @afenda/web dev` :3000 · `@afenda/*` only |
| S7.2 | S | route groups `(public)` `(operator)` `(client)` | ARCH-012 · ARCH-026 | router → slices → scaffold → nextjs → neon | `/` public · `/admin` + `/client/dashboard` guarded |
| S7.3 | M | `apps/web/modules/*` domain | ARCH-006 · ARCH-023 · ARCH-024 | router → slices → modules → neon | domain via `@afenda/db` public surface · typecheck |
| S7.4 | M | `apps/web/features/*` | ARCH-013 · ARCH-029 | router → slices → scaffold → modules → api | features do not import `@afenda/db` directly · smoke when e2e exists |
| **Checkpoint F** | — | build graph | ARCH-022 | slices | `turbo run build` · `turbo run typecheck` · no `pg` · no `lib/auth|env|db` under `apps/web` |
| S8.1 | S | `.github/workflows/ci.yml` | ARCH-022 | router → slices → lanes | CI green · Turbo remote cache token available |
| S8.2 | S | `.github/workflows/deploy.yml` | ARCH-022 | router → slices · deployment-expert if needed | prod deploy · Corepack/pnpm knobs |
| **Checkpoint G** | — | Target → Living | DOC-001 · ARCH-022…028 | slices → doc-control (separate Docs lane) | Status move only after tree matches; doc retirement = later Docs PR |

## Path truth (Target)

| Concept | Use | Do not use |
|---------|-----|------------|
| App | `apps/web` | repo-root `app/` |
| Edge gate | `apps/web/proxy.ts` | new `middleware.ts` |
| Features | `apps/web/features/**` | root `features/` |
| Domain | `apps/web/modules/**` | root `modules/` |
| Packages | `packages/{auth,db,env,ui,emails,config}` | parallel invented roots |

## Checkpoint pairing

| After finishing | Also close |
|-----------------|------------|
| S1.2 | Checkpoint A |
| S2.2 | Checkpoint B |
| S3.2 | Checkpoint C |
| S4.1 | Checkpoint D |
| S5.1 | Checkpoint E |
| S7.4 | Checkpoint F |
| S8.2 | Checkpoint G (docs Status = **separate** Docs-lane follow-up) |
