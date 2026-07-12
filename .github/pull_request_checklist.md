## Operator / rebuild PR checklist

Use with [`docs/frontend/08-operator-phase1-tasks.md`](../docs/frontend/08-operator-phase1-tasks.md). Agent entry: [`/using-afenda-elite-skills`](../.cursor/skills/using-afenda-elite-skills/SKILL.md) · catalog [`doc/architecture/afenda-elite-skills-architecture.md`](../doc/architecture/afenda-elite-skills-architecture.md).

- [ ] No restore of root `components/` (named migrate to `features/operator/` only)
- [ ] No closed journey phases (join / client workspace / account / playground / trade) unless explicitly reopened
- [ ] No Guardian / PA / owl / brand `public/` restore in operator PRs
- [ ] No new REST for dashboard reads (RSC → `lib/pages` → domain)
- [ ] `rg "@/components/" components-V2/platform-views/portal-views features/operator app/dashboard` empty when claiming operator rewire done
