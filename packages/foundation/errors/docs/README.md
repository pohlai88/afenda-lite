# `@afenda/errors` — package docs

Authority index for the errors foundation package. Product, semantic, and
admission governance docs live here. Consumer entry remains at package root.

| Document | Role |
| --- | --- |
| [PRD.md](./PRD.md) | Individual kernel package PRD (**operative**) |
| [CONTRACT.md](./CONTRACT.md) | Semantic control-plane SSOT (**operative**) |
| [ADMISSION.md](./ADMISSION.md) | Admission contract draft (unsigned) |
| [../README.md](../README.md) | Consumer and maintainer entry |
| [`packages/KERNEL-GOVERNANCE.md`](../../../KERNEL-GOVERNANCE.md) | Kernel requirement and lifecycle authority |
| [`packages/KERNEL-PRD-INDEX.md`](../../../KERNEL-PRD-INDEX.md) | Operative kernel PRD index (points here) |

## Authority rules

1. **Disk + this folder win.** Sealed consumer surface is `src/index.ts` +
   `CONTRACT.md`. Do not invent APIs from the integrated kit draft.
2. **Do not restore** package-root `PRD.md`, `CONTRACT.md`, `ADMISSION.md`,
   `PR.md`, or `.protected.sha256`.
3. **`docs/kernel/AFENDA-KERNEL-PACKAGE-PRD-KIT.md` is a stale review copy** for
   `@afenda/errors`. Its embedded draft still claims HTTP-as-non-goal,
   `normalizeUnknown` / `isFailure` root ops, and a non-living tree. Ignore that
   body until Docs-lane reopen rewrites the kit pointer to this folder.
4. **`docs/kernel/package-specs/foundation/errors/PRD.md` is absent** — do not
   recreate it without Docs-lane reopen.

## Enterprise launch blockers (KERNEL formalization)

Package cutover is sealed. KERNEL `VERIFIED` / digest seal still requires
admission signatories and G1–G10 in [PRD.md](./PRD.md) §18.3. Those are
governance gaps, not missing consumer API work.
