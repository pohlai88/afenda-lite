# Foundation Package Discipline

**Authority:** ARCH-024 (dormant) · [LAYERS.md](LAYERS.md) line 92 · [SKILL.md](SKILL.md) rule 8 · coding-standards

**Last verified:** 2026-07-21

---

## Binding Principles

### 1. Foundation Layer Composition

Foundation (Rank 1-A) is limited to exactly three packages:

| Package | Role | Dependencies |
|---------|------|--------------|
| `@afenda/config` | Dev-time tooling (Biome + TypeScript bases) | None (not a runtime import) |
| `@afenda/env` | Typed env contract (sole product env SSOT) | `@t3-oss/env-nextjs`, `zod` (external only) |
| `@afenda/errors` | Transport-neutral error codes + Result leaf | None |

**No other Foundation packages are permitted.** Foundation packages must not depend on any other `@afenda/*` runtime packages.

---

### 2. Forbidden Catch-All Patterns

The following generic package names are **permanently banned** across all layers:

- `@afenda/common`
- `@afenda/shared`
- `@afenda/utils`
- `@afenda/types`
- `@afenda/helpers`
- `@afenda/erp-utils`
- `@afenda/domain-kit`

**Rationale:** These become dependency escape hatches and dumping grounds for unrelated code, bypassing layer discipline and creating unmaintainable mega-packages.

---

### 3. Where Shared Code Belongs

If code needs sharing across packages, place it according to its nature:

| Code Type | Correct Location | Example |
|-----------|------------------|---------|
| Universal primitives | Foundation (`@afenda/errors`) | `AppError`, `Result<T>` |
| Infrastructure contracts | Runtime Infrastructure (`@afenda/http`) | Fetch compose, correlation |
| Data plane contracts | Data Plane (`@afenda/db`) | Schema definitions (not mutations) |
| Business orchestration | Application (`apps/web/modules/*`) | Cross-module workflows |
| UI primitives | Surfaces (`@afenda/ui-system`) | Button, Dialog, Toast |

**Do not create a generic package as a shortcut.** Extract to the lowest legal rank or keep orchestration in the application layer.

---

## Enforcement

### Implicit (Current)

The governance gate (`pnpm governance:packages`) enforces catch-all bans **implicitly** via:

1. `CATALOG_EXPECTED_PACKAGES` allowlist in `scripts/validate-modules/checks.mjs`
2. `validateCatalogDiskParity` check: any on-disk package not in the catalog → gate fails

**Result:** Catch-all packages cannot be added without breaking the gate.

**Evidence:**

```bash
# Verified 2026-07-21
pnpm governance:packages  # PASS
```

### Explicit (Future Enhancement)

Optional: Add `validateForbiddenPackageNames` to provide better error messages that explain the anti-pattern. See audit report for implementation.

---

## Verification Commands

```bash
# List Foundation packages on disk
Get-ChildItem packages\foundation -Directory
# Expected: config, env, errors

# Search for forbidden packages
pnpm exec tsx -e "
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
const forbidden = /^@afenda\/(common|shared|utils|types|helpers)$/;
for (const cat of readdirSync('packages')) {
  for (const pkg of readdirSync(join('packages', cat))) {
    const path = join('packages', cat, pkg, 'package.json');
    try {
      const { name } = JSON.parse(readFileSync(path, 'utf8'));
      if (forbidden.test(name)) console.log('FORBIDDEN:', name);
    } catch {}
  }
}
console.log('Scan complete.');
"

# Run governance gate
pnpm governance:packages
```

---

## Historical Context

**Audit date:** 2026-07-21  
**Audit scope:** Foundation packages + catch-all patterns  
**Result:** ✅ PASS — Current state correct; documentation expanded

**Changes made:**

1. Updated LAYERS.md line 92 to explicitly list `@afenda/utils`, `@afenda/types`, `@afenda/helpers`
2. Updated SKILL.md rule 8 to enumerate forbidden patterns with rationale
3. Created this companion reference document

**Authority chain:**

- User validation: "Packages I would keep unchanged — Foundation: `@afenda/config`, `@afenda/env`, `@afenda/errors`. This is correct."
- User instruction: "Do not add generic packages such as `@afenda/common`, `@afenda/shared`, `@afenda/utils`, `@afenda/types`, `@afenda/helpers`. Those almost always become dependency escape hatches."
- Skill authority: `/coding-standards` + `/afenda-elite-audit-orchestrator`
- Rule application: `coding-discipline` + `agent-authority-preflight`

---

## Related

- [LAYERS.md](LAYERS.md) — Full layer diagram + forbidden import table
- [SKILL.md](SKILL.md) — Monorepo discipline skill entry
- [packages/README.md](../../../packages/README.md) — Package catalog
- [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) — Operative monorepo governance
- [WORKSPACE-EDGE-REGISTER.yaml](../../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml) — Authorized edges
