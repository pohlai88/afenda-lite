---
name: afenda-elite-kernel
description: Deterministically scaffold, apply, implement, upgrade, verify, reopen, and readiness-seal reusable Afenda package kernels, including the protected @afenda/errors cross-boundary error kernel. Use when creating a new core package capability, applying an established kernel contract to another target, extending an existing package with new behavior, upgrading its public contract or internals, integrating @afenda/errors at a consumer boundary, or producing repeatable readiness evidence before declaring that kernel sealed.
---

# Afenda Elite Kernel

Operate a single evidence-driven lifecycle for reusable package kernels. Treat this skill as a delivery method, not authority to create a generic `@afenda/kernel`, shared mega-package, or new architectural layer.

## Load

Read before changing a target:

1. `AGENTS.md` and the nearest applicable repository rules.
2. The target `package.json`, public barrel, source, tests, README, and consumers.
3. `docs-V2/monorepo/README.md` and the owning farm selected by `using-afenda-elite-skills`.
4. [references/lifecycle.md](references/lifecycle.md) for mode and transition rules.
5. [references/seal-contract.md](references/seal-contract.md) for evidence and seal gates.
6. [references/errors-kernel.md](references/errors-kernel.md) when the target is `@afenda/errors` or the mission applies its contract to a consumer.

Load only the target-specific references required by the selected farm. Do not load absent Living `docs/**` as authority.

## Registered kernels

| Package | Target | Contract |
|---------|--------|----------|
| `@afenda/errors` | `packages/foundation/errors` | [references/errors-kernel.md](references/errors-kernel.md) |

## Required mission contract

Resolve these fields from the request and disk before editing:

```yaml
kernel_mission:
  target: <verified package or app path>
  mode: scaffold | apply | implement | upgrade | verify | seal | reopen
  capability: <one bounded capability>
  owner: <owning package or composition root>
  consumers: <verified direct consumers>
  acceptance: <observable outcomes and commands>
  authority: <farm and on-disk sources>
```

If `target`, ownership, or public-contract intent remains materially ambiguous after disk discovery, emit the repository `CONFUSION` block and request the missing decision.

## Deterministic workflow

### 1. Snapshot

Run the read-only inspector from the repository root:

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs <target>
```

Record `contentDigest`, public exports, scripts, dependencies, source files, tests, and working-tree state. Re-run after implementation and at seal.

### 2. Classify

Select exactly one mode using [references/lifecycle.md](references/lifecycle.md). Do not combine unrelated targets or capabilities in one mission.

### 3. Freeze the change contract

State before edits:

- owned capability and explicit non-goals;
- public inputs, outputs, error vocabulary, and compatibility class;
- allowed dependency edges and composition root;
- security, tenancy, data, and observability invariants that apply;
- focused verification commands and consumer evidence;
- seal-impacting files and expected post-change state.

Do not invent imports, exports, scripts, or helpers. Verify each on disk first.

### 4. Implement one complete slice

Preserve the target's established shapes. Create real behavior, boundary validation, production adapters, and tests required by the contract. Route special concerns to their owning farms:

| Concern | Owning farm |
|---------|-------------|
| New package, export surface, dependency edge | `afenda-elite-monorepo-discipline` |
| Ports, adapters, module residue | `afenda-elite-backend-modules` |
| API, result, schema, or OpenAPI contract | `afenda-elite-api-contract` |
| App Router or Server Action mechanics | `afenda-elite-nextjs-best-practice` |
| Product UI capability | `afenda-elite-ui-compose` |
| Module readiness claim | `afenda-elite-module-readiness` |
| Verification lane selection | `afenda-focused-verification` |

This skill orchestrates those farms; it does not replace their acceptance rules.

### 5. Verify from narrow to broad

Run target-local lint, typecheck, and tests first. Then run the smallest consumer or integration checks that prove the public contract. Use broader repository gates only when the owning verification farm requires them or the user approves them.

On failure, report the exact command and focused error, fix the cause, and rerun the failed gate. Never seal with a skipped, waived, timed-out, or unexplained required gate.

### 6. Seal or remain verified

Apply [references/seal-contract.md](references/seal-contract.md). Emit `SEALED` only when every required gate is green and a durable seal record location already exists or is explicitly named by the user or owning farm. Otherwise report `VERIFIED` with the missing seal condition.

A kernel seal is scoped evidence for the named capability and digest. It is not release approval, edition certification, a controlled-document lifecycle state, or Module Enterprise Readiness.

## Upgrade and reopen

Treat every change to a sealed target as `reopen` before implementation. Compare the new request and current snapshot with the prior seal record, classify the delta as `internal`, `additive`, or `breaking`, and invalidate only the affected evidence. Re-run all transitively affected gates before issuing a new seal.

Never preserve compatibility through a parallel public path unless the owning authority explicitly requires that path. Update consumers in the same bounded mission when the accepted contract changes.

## Completion report

Return:

```text
KERNEL RESULT: SCAFFOLDED | APPLIED | IMPLEMENTED | UPGRADED | VERIFIED | SEALED | REOPENED | BLOCKED
Target: <path>
Capability: <name>
Compatibility: internal | additive | breaking
Before digest: <sha256 or absent>
After digest: <sha256>
Contract changes: <exports, dependencies, behavior>
Evidence: <commands and outcomes>
Consumers checked: <paths or none>
Seal record: <durable path or not emitted>
Remaining conditions: none | <blocking condition>
```

## Resources

- [references/lifecycle.md](references/lifecycle.md) — modes, transitions, and required outputs.
- [references/seal-contract.md](references/seal-contract.md) — readiness gates and seal record schema.
- [references/errors-kernel.md](references/errors-kernel.md) — protected error-kernel contract, consumer application, upgrade rules, and focused gates.
- `scripts/inspect-target.mjs` — stable, read-only target inventory and content digest.
