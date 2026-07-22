# Validation report

- Original `schemas.ts` direct exports: **411**
- Refactored main schema exports: **411**
- Missing main exports: **0**
- Unexpected main exports: **0**
- Original `schemas-compliance.ts` direct exports: **29**
- Refactored compliance exports: **29**
- Missing compliance exports: **0**
- Unexpected compliance exports: **0**
- TypeScript syntax diagnostics: **0**
- Strict TypeScript structural check with generated dependency stubs: **passed**
- `noUnusedLocals`: **passed**
- `noUnusedParameters`: **passed**

The validation uses stubs only for unavailable external package files (`brands`, shared status modules, and Zod). It verifies this refactor's module structure, local references, import completeness, syntax, and public export parity; it does not replace running the package's real test suite after integration.
