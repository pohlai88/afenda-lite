## Operator / rebuild PR checklist

Use with [`doc/frontend/08-operator-phase1-tasks.md`](../doc/frontend/08-operator-phase1-tasks.md). Agent rules: [`.cursor/rules/agent-workflow.mdc`](../.cursor/rules/agent-workflow.mdc).

- [ ] No restore of root `components/` (named migrate to `features/operator/` only)
- [ ] No closed journey phases (join / client workspace / account / playground / trade) unless explicitly reopened
- [ ] No Guardian / PA / owl / brand `public/` restore in operator PRs
- [ ] No new REST for dashboard reads (RSC → `lib/pages` → domain)
- [ ] `rg "@/components/" components-V2/platform-views/portal-views features/operator app/dashboard` empty when claiming operator rewire done
