# `@afenda/emails`

Surfaces-layer React Email templates for **app-owned** mail composition in Afenda-Lite. Ships invite and password-reset HTML components plus `render*` helpers — not an SMTP transport and not the Neon Auth delivery path.

Use this package when the app composes its own invitation or reset HTML outside Neon Auth. Neon Auth org invites and password-reset mail are delivered by **Zoho SMTP** configured in the Neon Auth console (`email_provider` · `smtp.zoho.com`) — do **not** claim this package sends those Neon Auth flows. Maintainers preview templates with `email:dev` and run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import from the root barrel (server / Node only — do not import from client components):

```ts
import {
	OnboardingInviteEmail,
	renderOnboardingInviteEmail,
	PasswordResetEmail,
	renderPasswordResetEmail,
} from "@afenda/emails";

const inviteHtml = await renderOnboardingInviteEmail({
	inviteeName: "Ada",
	organizationName: "Afenda",
	inviteUrl: "https://example.com/join?invitationId=…",
});

const resetHtml = await renderPasswordResetEmail({
	recipientName: "Ada",
	resetUrl: "https://example.com/auth/reset-password?token=…",
});
```

Peer deps: `react` / `react-dom` `≥19`. Runtime dep: `react-email`.

**Neon Auth delivery (not this package):** `@afenda/auth` `inviteOrgMember` and Neon Auth password-reset UI use Zoho SMTP on Neon Auth. Optional app-owned compose may use these templates with `buildInviteJoinUrl` — they do not replace the Neon send path. See [docs-V2/auth](../../docs-V2/auth/README.md) · [AGENTS.md](../../AGENTS.md).

## Templates

| File | Export | Props |
|------|--------|-------|
| `src/onboarding-invite.tsx` | `OnboardingInviteEmail` · `renderOnboardingInviteEmail` | `inviteeName` · `organizationName` · `inviteUrl` |
| `src/password-reset.tsx` | `PasswordResetEmail` · `renderPasswordResetEmail` | `recipientName` · `resetUrl` |

Preview in the React Email dev server:

```bash
pnpm --filter @afenda/emails email:dev
```

Serves `./src` on port **3001**.

## Maintain

```bash
pnpm --filter @afenda/emails lint
pnpm --filter @afenda/emails typecheck
pnpm --filter @afenda/emails test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/emails` | Template components · prop types · `renderOnboardingInviteEmail` · `renderPasswordResetEmail` |

No subpath exports — barrel only (`.` in `package.json`).

## Ownership

| Surface | Owner |
|---------|-------|
| React Email templates · HTML render helpers | `@afenda/emails` |
| Neon Auth invite / password-reset **delivery** (Zoho SMTP) | Neon Auth console · `@afenda/auth` invite APIs |
| Product env (`APP_URL`, etc.) | `@afenda/env` + `.env.local` |
| Call sites that compose app-owned mail | Server packages / `apps/web` Actions (not client components) |

**Layer:** Surfaces (`react-email`; peer React 19). Must not import Platform internals for transport, and must not be imported from client components in `apps/web`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md).

## Out of scope

Do not add to this package: SMTP clients, Neon Auth `email_provider` configuration, Next.js route handlers, ActionResult envelopes, client-component imports, or claims that this package delivers Neon Auth password-reset / org-invite mail.

## Authority

| Topic | Link |
|-------|------|
| Neon Auth mail · Zoho SMTP · Path A UI | [docs-V2/auth](../../docs-V2/auth/README.md) |
| Package DAG / Surfaces rules | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
