# PA-P0 — ADR and doctrine approval

| Field | Value |
|-------|-------|
| **Status** | accepted |
| **Sequence** | 0 |
| **Depends on** | Approved reference PNGs |
| **Feeds into** | PA-P1–PA-P10 |

## Purpose

Lock portal background design doctrine and governance boundary before any atmosphere implementation.

## Authority

- [ADR-Portal-BG-001: Portal Atmosphere System](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md) — **Accepted 2026-07-08**
- Design references: `public/brand/heroes/auth-hero-dark.png`, `public/brand/heroes/auth-hero-light.png`

## Design system compliance

| Rule | This slice |
|------|------------|
| Token naming | `--portal-*` families named in ADR §Token families |
| Inversion rule | Dark: PROTECTED inverted; Light: TRUTH inverted |
| Auth freeze | No credential, session, or provider work under this ADR until PA-P10 |
| Migration policy | Prototype code in `portal-auth-*` is source material only |

## Inputs / outputs

- **Inputs:** Design mocks, draft ADR, stakeholder review
- **Outputs:** Accepted ADR; slice index; frozen non-goals

## Owned files

- `docs/architecture/adr/ADR-Portal-BG-001-portal-atmosphere-system.md`
- `docs/architecture/adr/README.md`
- `docs/architecture/slices/portal-atmosphere/README.md`

## Do

- Record decision outcome, migration policy, token ownership, visual regression, and accessibility text rules in the ADR.
- Link slices from ADR phased roadmap.

## Don't

- Start PA-P1 token files before ADR acceptance.
- Add or expand `.portal-auth-*` CSS for new visual behavior after acceptance; new visual work must land under `portal-atmosphere/`.

## Critical control points

- ADR status = **Accepted**
- Phase 0 exit criteria complete
- Reference PNGs approved for inversion intent
- `portal-auth-*` implementation marked as prototype source material, not extension target

## Failure modes

- Implementation begins without accepted ADR → theme drift and auth coupling
- Multiple inverted hero words per theme → brand logic breaks
- New visual work continues inside `.portal-auth-*` → migration boundary fails

## Required tests

- Documentation review only; no runtime tests

## Visual regression

Not applicable — no implementation output. Reference PNGs are the baseline for PA-P2 onward.

## Acceptance proof

- [x] ADR accepted
- [x] Dark and light reference PNGs approved
- [x] Theme inversion rule approved
- [x] Owl usage rule approved
- [x] Non-goals confirmed
- [x] Token names agreed
- [x] Slice index published
- [x] No auth behavior changes
- [x] No PA-P1+ implementation files created

## Next slice gate

PA-P1 may begin only after this slice is accepted and the ADR status is committed as `Accepted`.

PA-P1 must create token authority only. It must not move owl, hero, access slot, or auth layout code.

## Rollback

Revert ADR status to Proposed; halt PA-P1+ work.

## Drift risk

Engineers implement visuals in `portal-auth-layout.tsx` instead of `portal-atmosphere/` after ADR acceptance.
