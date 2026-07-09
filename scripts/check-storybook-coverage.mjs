#!/usr/bin/env node
/**
 * Validates Storybook UI evaluation stories against ui-decision-matrix registry.
 * Run: npm run check:storybook-coverage
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.cwd();
const storiesDir = join(repoRoot, "stories", "ui-evaluation");

/** Surfaces scored in the matrix but intentionally without UI Evaluation comparison stories. */
const STORY_EXEMPT_SURFACES = new Set([
  "auth-sign-out",
  "client-login",
  "client-home-redirect",
  "org-login",
  "public-survey-link",
  "public-secure-link",
  "client-preview-banner",
  "sidebar-playground",
  "trust-notice",
  "faq-section",
]);

/** Portal Atmosphere story files satisfy these matrix surfaces (no getEvaluationRow import). */
const ATMOSPHERE_SURFACE_COVERAGE = new Map([
  ["shell-auth", ["guardian-auth-facade.stories.tsx", "auth-shell.stories.tsx", "studio-canonical-kit.stories.tsx"]],
  ["client-join", ["auth-shell.stories.tsx"]],
]);

function listStoryFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".stories.tsx"));
}

function loadRegistryIds() {
  const runner = join(repoRoot, "scripts", "check-storybook-coverage-runner.ts");
  const output = execFileSync("npx", ["tsx", runner], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
  });
  return JSON.parse(output.trim());
}

function main() {
  const storyFiles = listStoryFiles(storiesDir);
  const { registryIds, matrixIds } = loadRegistryIds();
  const registrySet = new Set(registryIds);
  const matrixSet = new Set(matrixIds);

  const violations = [];
  const referencedSurfaces = new Set();

  for (const file of storyFiles) {
    const source = readFileSync(join(storiesDir, file), "utf8");

    for (const match of source.matchAll(/getEvaluationRow\(\s*["']([^"']+)["']\s*\)/g)) {
      const surfaceId = match[1];
      referencedSurfaces.add(surfaceId);
      if (!registrySet.has(surfaceId)) {
        violations.push(`${file}: unknown surfaceId "${surfaceId}"`);
      }
      if (!matrixSet.has(surfaceId)) {
        violations.push(`${file}: surfaceId "${surfaceId}" missing from uiEvaluationMatrix`);
      }
    }

    for (const [surfaceId, files] of ATMOSPHERE_SURFACE_COVERAGE) {
      if (files.includes(file)) {
        referencedSurfaces.add(surfaceId);
      }
    }
  }

  const missingCoverage = [...matrixSet].filter(
    (surfaceId) =>
      !referencedSurfaces.has(surfaceId) && !STORY_EXEMPT_SURFACES.has(surfaceId),
  );

  if (missingCoverage.length > 0) {
    console.warn("Storybook coverage gaps (matrix surface without ui-evaluation story):");
    for (const surfaceId of missingCoverage.sort()) {
      console.warn(`  - ${surfaceId}`);
    }
  }

  if (violations.length > 0) {
    console.error("Storybook coverage check failed:\n");
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    `storybook coverage OK (${storyFiles.length} story files, ${referencedSurfaces.size}/${matrixSet.size} matrix surfaces referenced)`,
  );

  if (missingCoverage.length > 0) {
    console.log(
      `note: ${missingCoverage.length} surfaces lack dedicated comparison stories (see warn list above)`,
    );
  }
}

main();
