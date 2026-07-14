/**
 * Gates npm scripts whose Collapse-era implementations were removed.
 * New file for this checkout — do not replace with git-recovered script bodies.
 * Authority: docs/architecture/system/ARCH-028-implementation-slices.md Anti-contamination lock
 */
const label = process.argv.slice(2).join(" ") || "this npm script";
console.error(
  [
    `unavailable: ${label}`,
    "",
    "This script belonged to the Collapse-era product / ops ladder and is not present in the docs-first checkout.",
    "Forbidden: restoring wiped scripts or product trees (app/, modules/, features/, components-V2/) from git history.",
    "Forward path: Target greenfield after an explicit ARCH-028 implement request (apps/web, packages/*).",
    "Docs-capable checks that remain: npm run check:docs-naming · check:doc-integrity · check:module-quality · check:openapi · validate:neon-env",
  ].join("\n"),
);
process.exit(1);
