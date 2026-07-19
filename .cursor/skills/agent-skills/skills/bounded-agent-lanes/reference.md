# Bounded Agent Lanes — Repo reference

Updatable defaults for this repository. The skill core in [SKILL.md](SKILL.md) stays lane-generic; edit this file when the active lane or rollout context changes.

---

## Current active lane

**No FFT / Declarations product lane** (nuclear wipe — commit `54b4e8b` and successors).

Default agent mission is **not** Feed Farm Trade or Client Declarations. Route product work through [using-afenda-elite-skills](../../../using-afenda-elite-skills/SKILL.md). Compulsory ban surface: [deprecation register — Closed product phases](../deprecation-and-migration/reference.md).

Living modules/features on disk: `platform` · `identity` · `auth` · `org-admin` · `portal-chrome` · `landing`.

---

## Feed Farm Trade / Declarations — closed (do not reopen)

| Fact | Detail |
|------|--------|
| Product trees | `modules/{fft,declarations}` · `features/{fft,declarations}` · `/fft/**` · declaration-draft RH — **gone** |
| Skill | `feed-farm-trade` — **deleted**; catalog row `forbidden` |
| Living docs | `docs/modules/feed-farm-trade/**` dormant/absent — do not invent Living FFT packs |
| Env flags | Do not treat `FFT_*` / survey playground keys as active product reopen levers |

### Forbidden without explicit named approval this turn

- Recreate wiped FFT / Declarations modules, features, routes, or the `feed-farm-trade` skill
- Mix domain reopen with repo Normalize / housekeeping commits

---

## Typical living-shell checks

| Check | Command |
|-------|---------|
| Unit / contract | `pnpm test` / scoped `pnpm --filter @afenda/web test` |
| Lint · types | `pnpm lint` · `pnpm typecheck` |
| Env | `.env.local` + `import { env } from '@afenda/env'` (compose retired) |
| Neon contract | `pnpm validate:neon-env` |

---

## Other program lanes

| Lane | Entry |
|------|-------|
| Elite product router | [using-afenda-elite-skills](../../../using-afenda-elite-skills/SKILL.md) |
| Closed product phases | [deprecation-and-migration/reference.md](../deprecation-and-migration/reference.md) |
| Scratch ops packs | [docs-V2/README.md](../../../../docs-V2/README.md) |
