# Agent instructions — Client Declaration Portal

## Environment variables

### Source of truth (local dev)

Human-maintained files (gitignored):

| File | Contents |
|------|----------|
| `env.config` | Non-secrets: URLs, emails, feature flags, playground fixtures |
| `env.secret` | Credentials: `DATABASE_URL`, passwords, API keys |

Templates (committed): `env.config.example`, `env.secret.example`.

**Workflow**

1. Edit `env.config` and/or `env.secret`.
2. Run `npm run env:compose` → regenerates `.env` for Next.js and scripts.
3. Run `npm run dev`.

`.env` is **generated** — do not edit it by hand.

### Playground (`/playground`) — local developer UI review only

`PLAYGROUND_*` vars live in `env.config` for **local developer UI review** (iframe embeds of real routes). **Never sync them to Vercel production.** Production deployments must not expose `/playground`; the route is gated by `PLAYGROUND_ENABLED=true` which stays local-only.

**Not part of the client product**

- `/playground` is a **developer harness** — not a client entry point, not documented in client journeys, and not used in production.
- Client routes (`/`, `/client/login`, `/client/*`) are accessed **directly** by clients. Playground may iframe those URLs locally with `?embed=1` for layout review only.
- Do **not** add product features, auth flows, or architecture that depend on `PLAYGROUND_*` or `/playground/*`.
- Do **not** suggest playground screens or bindings when implementing client gate routes, onboarding, or sign-in — use Storybook (`stories/**`) or E2E for client UI validation instead.

### Vercel production sync

**Direction:** local → Vercel only (`env.config` + `env.secret` → Vercel production).

| Command | Purpose |
|---------|---------|
| `npm run env:compose` | Merge config + secret → `.env` |
| `npm run audit:vercel` | Compare key **names** on Vercel (no values) |
| `npm run sync:vercel` | Push canonical production keys to Vercel |
| `npm run cleanup:vercel` | Remove stale Supabase/SMTP keys from Vercel |

**Keys synced to Vercel production:** Neon (`DATABASE_URL`, `NEON_AUTH_*`), admin/preview client, `APP_URL`, MailerSend.

**Keys never synced:** `PLAYGROUND_*`, `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID`, Shadcn Studio (`SHADCN_STUDIO_*`, `LICENSE_KEY`, `EMAIL`).

After `sync:vercel`, redeploy: `vercel deploy --prod --yes`.

### Blocked commands (do not run)

- **`vercel env pull`** — Vercel redacts secrets as empty strings on pull, which causes false audit mismatches and agent errors. Blocked by `scripts/vercel-env-guard.mjs`.
- Do not create scripts that pull Vercel env into local files.
- Do not overwrite `env.config` / `env.secret` from Vercel.

Use `npm run audit:vercel` for key-name validation instead.

---

## Storybook MCP (`client-declaration-portal-sb-mcp`)

When working on UI components or stories, use the **`client-declaration-portal-sb-mcp`** MCP tools. Storybook must be running first:

```bash
npm run storybook
```

MCP endpoint: `http://localhost:6006/mcp`

### Rules

- **Never hallucinate component properties.** Before using any prop on a portal or shadcn component, query MCP documentation.
- Call `list-all-documentation` to discover documented components.
- Call `get-documentation` for props, examples, and usage.
- Call `get-storybook-story-instructions` before creating or updating stories (CSF3, interaction tests).
- Validate work with `run-story-tests` when Storybook Test is configured.
- Only use props shown in documentation or example stories.

### Portal conventions

- Stories live in `stories/**/*.stories.tsx` (UI evaluation comparisons).
- Import app styles via `.storybook/preview.ts` (`app/globals.css`).
- `next/link` and `next/image` are mocked in `.storybook/mocks/` for Vite.
- Brand assets are served from `public/` via Storybook `staticDirs`.
- Prefer existing portal wrappers (`portal-*` components) over raw shadcn-studio blocks.

### Story authoring (CSF3)

- One story file per surface group; descriptive story names.
- Use `parameters.layout: "fullscreen"` for shells and page layouts.
- Use `render` only when composing multiple components; prefer `args` for simple variants.
- Add `tags: ['autodocs']` when documenting reusable components with a `component` meta field.

---

## Testing

Authority: [`testing/README.md`](testing/README.md). Gap analysis: `/afenda-test` + [`.agents/subagents/afenda-test-engineer.md`](.agents/subagents/afenda-test-engineer.md).

### Pyramid

| Layer | Runner | Location |
| --- | --- | --- |
| L0 | Vitest node | `lib/**/*.test.ts` |
| L2 | Vitest jsdom | `**/*.interaction.test.tsx` |
| L4 smoke | Playwright `@smoke` | `e2e/**/*.spec.ts` |
| L4 journey | Playwright `@journey` | `e2e/**/*.spec.ts` |

Registry scripts (`npm run checks`) are non-Vitest L0 substitutes for copy, nav, and proxy allowlists.

### Factory SSOT

Credentials, fixtures, Playwright base, and React test helpers live under **`testing/`** only. Specs import from `@/testing/e2e/*` — do not duplicate helpers in `e2e/helpers/`.

### Commands

| Command | When |
| --- | --- |
| `npm run test:unit` | Pure lib routing, policy, href builders |
| `npm run test:interaction` | Radix menus, dialogs, dropdowns |
| `npm run test:e2e:smoke` | Auth ingress, health, public-link redirects (CI) |
| `npm run test:e2e:journey` | Full operator/client flows (pre-release) |
| `npm test` | All Playwright projects locally |

### E2E environment

| Variable | Purpose |
| --- | --- |
| `SHARED_ADMIN_EMAIL` / `SHARED_ADMIN_PASSWORD` | Operator login (CI + local) |
| `E2E_OPERATOR_EMAIL` / `E2E_OPERATOR_PASSWORD` | Operator override |
| `PREVIEW_CLIENT_EMAIL` / `CLIENT_DEFAULT_PASSWORD` | Preview client for journeys |
| `E2E_CLIENT_EMAIL` / `E2E_CLIENT_PASSWORD` | Client override |
| `E2E_SURVEY_SLUG` / `E2E_INVITE_TOKEN` | Public link smoke without operator create |

Run `npm run env:compose` before local E2E. CI injects secrets from GitHub Actions.
