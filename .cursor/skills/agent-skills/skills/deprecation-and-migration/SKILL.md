---
name: deprecation-and-migration
description: >-
  Manages deprecation and migration with a hardened compulsory bar for
  already-replaced residue. Use when removing old systems, APIs, names, or
  shells; migrating consumers; or deciding maintain vs sunset. In this portal,
  prefer compulsory removal over soft/advisory deprecation for replaced paths.
---

# Deprecation and Migration

## Overview

Code is a liability, not an asset. Deprecation is the discipline of removing code that no longer earns its keep. Migration moves consumers safely from old to new.

**Afenda-Lite hardening (this repo):** when a replacement already ships, deprecation is **compulsory**, not advisory. Soft warnings that leave dead shells, dual product names (including **Client Declaration Portal**), or parallel infra “courses” are a failure mode — agents reintroduce them.

## When to Use

- Replacing an old system, API, library, route, shell, or product name
- Sunsetting a feature that's no longer needed
- Consolidating duplicate implementations
- Removing dead code that nobody owns but everybody depends on
- Planning the lifecycle of a new system (deprecation planning starts at design time)
- Deciding whether to maintain a legacy system or invest in migration
- Anything listed in [reference.md](reference.md) (portal rejected / retired register)

## Core Principles

### Code Is a Liability

Every line of code has ongoing cost. When the same functionality exists with less code or a clearer name — the old path should go.

### Hyrum's Law Makes Removal Hard

Observable behavior gets depended on. That is why migration must be active. It is **not** an excuse to keep dual product identities or remount deleted shells “for compatibility” after redirects exist.

### Deprecation Planning Starts at Design Time

Ask: “How would we remove this in 3 years?” Prefer clean interfaces, flags, and minimal surface area.

### Rejected Work Is Compulsory Deprecation

If the user (or an Accepted ADR) **rejects**, **retires**, or **hard-deletes** an approach, treat it as **compulsory forever until explicit reopen**. Do not soft-deprecate, shim forever, or re-implement from an old plan. See `/using-afenda-elite-skills` + [reference.md](reference.md).

## The Deprecation Decision

```
1. Does this still provide unique value?
   → If yes, maintain. If no, proceed.

2. Does a replacement already ship?
   → If yes in this portal → COMPULSORY (default). Advisory only if replacement is incomplete.

3. How many consumers remain?
   → Quantify. Redirects / adapters count as temporary migration aids, not permanent homes.

4. What's the cost of NOT removing it?
   → Agent confusion, dual naming, security surface, onboarding cost.

5. Is this on the portal rejected register?
   → If yes → refuse reintroduction; remove residue when touched.
```

## Compulsory vs Advisory

| Type | When | Mechanism |
|------|------|-----------|
| **Compulsory (default when replaced)** | Replacement ships; ADR retired the old name/path/shell; user rejected; hard-delete already landed | Hard ban on reintroduction · migrate or redirect · delete residue on touch · no new features on old path |
| **Advisory** | Replacement incomplete or dual-run required by external consumers you do not own | Warnings, docs, timeline — still plan a removal date |

**Do not default to advisory here.** Advisory is the exception. Soft deprecation that leaves `FftShell`, Hot Sales naming, `/trade` as a product URL, or a separate FFT infra “course” is **out of policy**.

Compulsory still requires a working replacement (or an Accepted decision that the capability is gone). You cannot delete without an alternative when users still need the capability — but you also cannot keep the old identity once the new one is canonical.

## Afenda-Lite rules (read [reference.md](reference.md))

1. **Product name is Afenda-Lite** (beta edition). **Afenda-Elite** is battle-proven; both share DOC-001 docs control. **Client Declaration Portal** and "this app is a portal" framing are retired.
2. **One SaaS, multiple modules** (`declarations` | `fft` | …). Platform/infra updates are shared — never deprecate “into” a second stack.
3. **Retired identities stay retired:** Hot Sales, `/trade` product URLs, `HOT_SALES_*`, `FftShell`, live `/fft/[locale]`, Client Declaration Portal.
4. **Redirects are migration aids**, not permission to rebuild the old tree.
5. **Historical tags / archive docs** may remain as footnotes; do not retag or restore as live entry points.
6. **On touch:** if a file still teaches a retired product name or mounts a retired path, delete or rewrite in the same PR.

## The Migration Process

### Step 1: Confirm Replacement

Replacement must cover critical use cases and be the canonical name/path in ADRs.

### Step 2: Record Compulsory Notice

```markdown
## Deprecation: <OldName>

**Status:** Compulsory — retired <date>
**Replacement:** <NewName> (ADR / skill link)
**Removal:** No reopen without explicit user/ADR decision
**Reason:** <one line>
**Forbidden:** remount, dual-name in UI/docs, new features on old path
```

### Step 3: Migrate Incrementally

```
1. Find all touchpoints (code, docs, env, nav, tests)
2. Point consumers at replacement
3. Verify (tests / checks / redirects)
4. Remove old references — do not leave “legacy alias” docs that teach the old name as current
5. Confirm no regressions
```

**Churn Rule:** If you own the infra, migrate consumers or provide a redirect. Do not announce and walk away.

### Step 4: Remove Residue

Only after consumers are on the replacement (or only redirects remain):

```
1. Zero product entry points to the old system
2. Delete code / tests / live docs that present the old path as current
3. Keep archive footnotes only where history matters (immutable tags, ADR “Rejected”)
4. Update the portal register in reference.md if a new item was retired
```

## Migration Patterns

### Strangler

Parallel run → shift traffic → idle old → **delete** old. Do not stop at “idle forever.”

### Adapter / Redirect

OK as a temporary bridge (`/trade` → `/fft`). Not OK as a forever product surface or an excuse to remount `FftShell`.

### Feature Flag

Use flags to cut over writes/reads. When flag is permanently on for the replacement, remove the old branch.

## Zombie Code

No owner + active consumers + stale docs = limbo. Assign ownership or compulsory-migrate. Zombie dual names (Hot Sales + FFT) are especially toxic for agents — remove the old name from live SSOT.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| “It still works, why remove it?” | Agent and ops cost of dual paths exceeds keep cost. |
| “Someone might need it later” | Rebuild if needed; do not keep rejected shells. |
| “Advisory is safer” | Soft deprecation reintroduces FftShell / Hot Sales / separate-infra framing. |
| “Leave a shim for convenience” | Redirect only; no product UI on the shim. |
| “FFT infra is a different course” | Rejected — one platform, two modules. |
| “We'll clean docs later” | Docs that teach retired names are active defects. |

## Red Flags

- Soft deprecation of something already replaced in prod
- New features on a deprecated path
- Remounting rejected shells or locale product trees
- Dual product names in live UI/nav/ops docs
- Treating module boundaries as separate deployables without an ADR
- Deprecation notices with no removal / no register update
- Archive folders re-linked as current SSOT

## Verification

- [ ] Replacement is canonical in Accepted ADR / skill SSOT
- [ ] Item listed in [reference.md](reference.md) if portal-specific
- [ ] No live product entry to the old path (redirect-only OK)
- [ ] Agents cannot honestly read live docs as endorsing the old name
- [ ] Old code/tests/config removed or quarantined as archive footnotes
- [ ] Platform/infra changes still shared across modules (no new FFT-only stack)
