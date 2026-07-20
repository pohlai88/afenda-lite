# Runtime Infrastructure Subpath Exports - Implementation Summary

**Date:** 2026-07-21  
**Status:** Audit Complete, Implementation Planned  
**Authority:** coding-standards skill + AGENTS.md

## What Was Done

✅ **Audit completed** of all runtime infrastructure packages  
✅ **Pattern documented** for runtime-specific subpath exports  
✅ **Migration plan created** with concrete examples  
✅ **Reference implementation identified** (@afenda/logger)  
✅ **Critical issues identified** (@afenda/metrics needs immediate fix)

## The Problem

Runtime infrastructure packages must prevent Node-only dependencies from being bundled into Edge/Vercel Functions. Without explicit subpath exports, importing from the root barrel can accidentally pull in `prom-client`, `pino`, `node:fs`, etc., causing Edge runtime failures.

### Bad (Current State)
```typescript
// apps/web/middleware.ts (Edge Runtime)
import { recordHttpRequest } from "@afenda/metrics";
// ❌ BREAKS: Tries to load prom-client in Edge → Runtime error
```

### Good (After Implementation)
```typescript
// apps/web/middleware.ts (Edge Runtime) 
import { recordHttpRequest } from "@afenda/metrics/edge";
// ✅ WORKS: Edge-safe console emit or no-op

// apps/web/app/api/users/route.ts (Node Runtime)
import { recordHttpRequest } from "@afenda/metrics/node";
// ✅ WORKS: Full Prometheus implementation
```

## Standard Pattern

```json
{
  "exports": {
    "./core": "./src/core/index.ts",    // Universal types & constants
    "./node": "./src/node/index.ts",    // Node-only implementation
    "./edge": "./src/edge/index.ts",    // Edge-safe implementation
    "./testing": "./src/testing/index.ts" // Test utilities
  }
}
```

## Package Status — CORRECTED

| Package | Status | Priority |
|---------|--------|----------|
| `@afenda/logger` | ✅ **DONE** - Has `/edge` | Reference |
| `@afenda/metrics` | 🔴 **CRITICAL** | **P0** - Needs `/core`, `/node`, `/testing` (edge adapter when real consumer exists) |
| `@afenda/http` | ✅ **UNIVERSAL** | - All code works in both runtimes |
| `@afenda/openapi` | 🟡 **CLARIFY** | P1 - Rename `/document` → `/node` (separate mission) |
| `@afenda/security` | ✅ **OK** | - Universal, no change needed |
| `@afenda/rate-limit` | ✅ **OK** | - Universal, no change needed |
| `@afenda/cache` | ✅ **OK** | - Universal, no change needed |

**Key Corrections Applied:**
1. Edge adapter implementation requires real telemetry sink (not no-op stub)
2. Core types must exclude prom-client dependencies
3. No root export - atomic breaking cutover
4. AST codemod required for safe migration
5. Import gates added immediately (not deferred)

## Documents Created

1. **[runtime-subpath-exports-audit.md](./runtime-subpath-exports-audit.md)**
   - Comprehensive audit of all runtime packages
   - Package-by-package implementation plans
   - Export structure patterns
   - Verification steps

2. **[runtime-subpath-exports-examples.md](./runtime-subpath-exports-examples.md)**
   - Real-world before/after code examples
   - Edge vs Node usage patterns
   - Common mistakes to avoid
   - Migration guide

3. **[MIGRATION-CHECKLIST-runtime-subpaths.md](./MIGRATION-CHECKLIST-runtime-subpaths.md)**
   - Concrete step-by-step checklist
   - Directory restructuring commands
   - File-by-file migration tasks
   - Automated migration script
   - Verification commands
   - Success criteria

4. **[packages/README.md](../../packages/README.md)** *(updated)*
   - Documented subpath export pattern
   - Updated Runtime Infrastructure table
   - Linked to audit docs

## Immediate Next Steps — CORRECTED

### Phase 1: Implement @afenda/metrics Split
```bash
# 1. Restructure package (see corrected checklist)
cd packages/runtime/metrics
# - Create /core (truly universal - no prom-client types)
# - Create /node (Prometheus implementation)
# - Create /testing (test utilities)
# - NO /edge implementation (stub violates no-shim rule)

# 2. Update package.json (no root "." export)
# 3. Migrate consumers with AST codemod (not sed)
# 4. Add import gates to governance:packages

# 5. Verify
pnpm --filter @afenda/metrics typecheck test
pnpm --filter @afenda/web build
pnpm governance:packages
```

### Phase 2: Separate Mission - @afenda/openapi
- Handle after metrics complete
- Keep failure scope narrow

### Review First
```bash
# Review corrected documents
cat docs-V2/_scratch/MIGRATION-CHECKLIST-runtime-subpaths.md
# Key changes: no /edge stub, AST codemod, immediate gates
```

## Benefits After Implementation

✅ **Edge runtime safety** - Can't accidentally import Node code  
✅ **Bundle size optimization** - Edge bundles don't include prom-client  
✅ **Type safety** - Explicit imports make intent clear  
✅ **Future-proof** - Pattern established for new packages  
✅ **Consistency** - Matches @afenda/logger's proven approach  
✅ **Better DevX** - Clear separation of concerns

## Estimated Effort — UPDATED

| Task | Effort | Risk |
|------|--------|------|
| @afenda/metrics restructure | 3-4 hours | Low - mechanical refactor with corrections |
| AST codemod development | 2-3 hours | Low - standard TS transform |
| Consumer migration (43 files) | 30 min | Very Low - automated via codemod |
| Testing & verification | 1-2 hours | Low - existing tests work |
| Import gates addition | 1 hour | Low - governance script extension |
| @afenda/openapi rename | 30 min | Very Low - separate mission |
| **Total (critical path)** | **7-10 hours** | **Low** |

**Corrections add ~2-3 hours** for:
- Proper core/node type split
- AST codemod implementation
- Import gate integration
- Contract test additions

## Risk Assessment

**Low Risk Because:**
- @afenda/logger already proves the pattern works
- Changes are mechanical file moves + import updates
- Existing functionality doesn't change
- Tests catch any issues immediately
- Rollback is simple (git revert)

**Potential Issues:**
- Missed import updates → TypeScript errors (caught at build)
- Edge functions accidentally using /node → Runtime errors (caught in testing)
- Test utilities not properly isolated → Test failures (caught in CI)

All issues are caught before production by build/test gates.

## Authority & References

- [coding-standards skill](../../.claude/skills/coding-standards/SKILL.md) - Subpath export pattern
- [AGENTS.md](../../AGENTS.md) - Runtime infrastructure requirements  
- [packages/README.md](../../packages/README.md) - R1-B Runtime Infrastructure
- @afenda/logger source - Reference implementation
- Vercel Edge Runtime docs - Edge API limitations

## Decision Required — UPDATED

**Proceed with corrected Phase 1 (@afenda/metrics) implementation?**

✅ **Yes (Recommended with corrections)** - Higher effort but production-grade
- No stub implementations (violates no-shim rule)
- Truly universal core types
- Safe AST-based migration
- Immediate governance gates

⏸️ **Review Corrections First** - Validate updated approach with team

❌ **Defer** - Accept Edge runtime risk and missing isolation

---

**Implementation Status:** Documented with senior review corrections applied  
**Next Milestone:** Phase 1 complete with proper core/node split, no edge stub, AST codemod  
**Success Metric:** All gates pass + no false observability + production-safe runtime isolation

**Critical Verdict:** Conditional approval granted after removing edge stub, correcting core types, requiring AST codemod, and adding immediate import gates.
