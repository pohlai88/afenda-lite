# Neon Slice Score

Companion to [SKILL.md](SKILL.md). Load only for `N*` / Neon Auth optimisation missions.

**Done:** acceptance matrix green + **Neon Slice Score** emitted. Product close requires independent auditor `APPROVED` ([neon-command-sheet.md](neon-command-sheet.md) § Audit). GUIDE-018 “closed” is not APPROVED.

Scratch discovery: skill-local neon maps (historical `docs/scratch/neon-auth-optimisation/` may be absent). Authority: AGENTS.md · ARCH-023 · ARCH-026 · GUIDE-018 · ARCH-027 operative IDs · owning MOD/ADR (Living bodies dormant).

## QUALITY ORDER (binding)

A green build that violates a higher rule is a failed slice.

```text
1. AUTHORITY-FIRST     AGENTS · ARCH-023 · ARCH-026 · GUIDE-018 · owning MOD/ADR
2. CONTRACT-FIRST      @afenda/env · @afenda/auth · package boundaries · no raw process.env
3. SECURITY-FIRST      session · membership · permission · hard tenancy · redirect safety · secrets
4. CAPABILITY-FIRST    no local compensation; named findings; no fake success / silent null
5. VERIFICATION-FIRST  acceptance matrix + floor commands with pasted results
6. OPS-FIRST           validate scripts · trusted domains · runbook honesty (no secret commit)
```

## Neon boundaries (from Neon / Afenda locks)

| Keep | Reject without Approved slice |
|------|-------------------------------|
| Neon Serverless Postgres + Neon Auth via `@afenda/auth` | Data API as product data path |
| Drizzle / `@afenda/db` | Preview Object Storage / Functions / AI Gateway by proximity |
| Pooled `-pooler` for product `DATABASE_URL` | Casual branch switch / day-to-day `neonctl link` rewrite |
| Neon org roles = identity signals only | App-side SMTP for Neon Auth / Neon shared mail (Zoho SMTP via Neon Auth console is required — ARCH-026) |
| Hard `organization_id` tenancy | Multi-DB / project-per-tenant isolation claims |

Vendor depth: `.agents/skills/neon` · `neon-postgres` (esp. `references/neon-auth.md`). Domain farm: `neon-tenancy-efficiency`.

## Score (/100%)

| Dimension | Max | Full points when |
|-----------|-----|------------------|
| AUTHORITY | 15 | Living authorities loaded; scratch not SSOT; Decision lock intact |
| CONTRACT | 20 | Typed env/auth/session; honest exports; no dual paths |
| SECURITY | 20 | Authn + membership + authz + tenancy + redirect allowlist + secret hygiene |
| CAPABILITY | 15 | Gaps closed or named findings; no incomplete/fake product paths |
| VERIFICATION | 15 | Every criterion has impl + command evidence; floor green |
| OPS | 15 | Validate/runbook/domains aligned; no secret in VCS |

**Caps**

| Condition | Effect |
|-----------|--------|
| Secret committed or logged in clear | SECURITY=0 · score ≤40 |
| Soft tenancy / open redirect / silent unauth success | SECURITY=0 · score ≤50 |
| Incomplete product path / fake complete | CAPABILITY=0 · score ≤50 |
| Missing floor command results | VERIFICATION=0 |
| Scratch treated as Living SSOT | AUTHORITY ≤5 |

**Path to 100%:** one sentence (two max) naming the highest-impact fix in QUALITY ORDER.

**Examples (advisory)**

```text
### Neon Slice Score: 92% / 100%
| Dimension | Score | Note |
| AUTHORITY | 15/15 | ARCH-026 + AGENTS loaded |
| CONTRACT | 18/20 | Env via @afenda/env; one dual-path note in docs |
| SECURITY | 20/20 | Role home + callback allowlist proven |
| CAPABILITY | 15/15 | Single resolver; findings named for I3.1 |
| VERIFICATION | 12/15 | Unit green; browser proof deferred → Path |
| OPS | 12/15 | validate:neon-env green; domain list not re-checked |
**Path to 100%:** Add authenticated browser proof for operator→/admin and client→/client/dashboard; re-list Neon Auth trusted domains.
```

```text
### Neon Slice Score: 45% / 100%
| Dimension | Score | Note |
| AUTHORITY | 10/15 | Scratch treated as primary acceptance text |
| CONTRACT | 15/20 | redirectTo still hardcoded "/" |
| SECURITY | 0/20 | Open redirect risk on callbackUrl |
| CAPABILITY | 5/15 | Role logic duplicated in feature |
| VERIFICATION | 5/15 | Typecheck only; no matrix |
| OPS | 10/15 | Env validate green |
**Path to 100%:** Fix AUTHORITY (Living docs only); add allowlisted callback + one resolver; fill acceptance matrix + floor commands.
```

## Emit template (required)

```text
### Neon Slice Score: <N>% / 100%
| Dimension | Score | Note |
| AUTHORITY | x/15 | … |
| CONTRACT | x/20 | … |
| SECURITY | x/20 | … |
| CAPABILITY | x/15 | … |
| VERIFICATION | x/15 | … |
| OPS | x/15 | … |
**Path to 100%:** <one sentence>
```

## Acceptance evidence matrix (required with score)

| Criterion | Implementation evidence (path) | Test / command evidence | Status |
|-----------|-------------------------------|-------------------------|--------|
| … | file:symbol | command → result | PASS / FAIL / N/A |

Verified completeness = passed criteria / total criteria — not files changed.

## States

| State | Meaning |
|-------|---------|
| UNEVALUATED | Default until first scored mission |
| SCORED | Implementer emitted score + matrix — not closed |
| APPROVED | Independent auditor APPROVED |
| REJECTED | Repair required; next slice locked |
| BLOCKED | External dependency; findings only |

Implementer must not self-APPROVE.
