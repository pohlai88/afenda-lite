#!/usr/bin/env node
/**
 * Validates storybook-static build output (post `npm run build-storybook`).
 * Run: npm run check:storybook-static
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const outputDir = join(repoRoot, "storybook-static");
const assetsDir = join(outputDir, "assets");
const storiesSourceDir = join(repoRoot, "stories", "ui-evaluation");

const REQUIRED_ROOT_FILES = [
  "index.html",
  "iframe.html",
  "project.json",
  "favicon.svg",
];

/** PA hero benchmark + dual owl assets — must be copied from public/ via staticDirs. */
const REQUIRED_PUBLIC_ASSETS = [
  "brand/heroes/auth-hero-dark.png",
  "brand/heroes/auth-hero-light.png",
  "owl-variants/allowed-base/darkbg-removebg-preview2.png",
  "owl-variants/allowed-base/whitebg-removebg-preview2.png",
];

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`OK    ${message}`);
}

function listStorySources() {
  if (!existsSync(storiesSourceDir)) {
    return [];
  }

  return readdirSync(storiesSourceDir)
    .filter((name) => name.endsWith(".stories.tsx"))
    .map((name) => name.replace(/\.stories\.tsx$/, ""));
}

function listStoryChunks() {
  if (!existsSync(assetsDir)) {
    return [];
  }

  return readdirSync(assetsDir)
    .filter((name) => name.includes(".stories-") && name.endsWith(".js"))
    .map((name) => name.split(".stories-")[0]);
}

function main() {
  console.log("Storybook static validation\n");

  if (!existsSync(outputDir)) {
    fail("storybook-static/ missing — run: npm run build-storybook");
    process.exit(1);
  }

  let ok = true;

  for (const file of REQUIRED_ROOT_FILES) {
    const path = join(outputDir, file);
    if (!existsSync(path)) {
      fail(`missing root file: ${file}`);
      ok = false;
      continue;
    }
    pass(`root file present: ${file}`);
  }

  for (const asset of REQUIRED_PUBLIC_ASSETS) {
    const path = join(outputDir, asset);
    if (!existsSync(path)) {
      fail(`missing public asset: ${asset}`);
      ok = false;
      continue;
    }
    pass(`public asset present: ${asset}`);
  }

  const sources = listStorySources();
  const chunks = listStoryChunks();

  if (sources.length === 0) {
    fail("no story sources found under stories/ui-evaluation");
    ok = false;
  } else {
    pass(`story sources discovered: ${sources.length}`);
  }

  const missingChunks = sources.filter((source) => !chunks.includes(source));
  const extraChunks = chunks.filter((chunk) => !sources.includes(chunk));

  if (missingChunks.length > 0) {
    for (const source of missingChunks) {
      fail(`story chunk missing for source: ${source}.stories.tsx`);
    }
    ok = false;
  } else if (sources.length > 0) {
    pass(`all ${sources.length} story sources have built chunks`);
  }

  if (extraChunks.length > 0) {
    for (const chunk of extraChunks) {
      fail(`orphan story chunk without source: ${chunk}.stories-*.js`);
    }
    ok = false;
  }

  if (existsSync(assetsDir)) {
    const assetFiles = readdirSync(assetsDir);
    const totalBytes = assetFiles.reduce((sum, name) => {
      return sum + statSync(join(assetsDir, name)).size;
    }, 0);
    pass(`assets bundle: ${assetFiles.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  }

  if (!ok) {
    console.error("\nvalidate-storybook-static failed");
    process.exit(1);
  }

  console.log("\nvalidate-storybook-static OK");
}

main();
