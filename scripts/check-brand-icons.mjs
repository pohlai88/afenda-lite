import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = join(ROOT, "public", "icons", ".brand-icons-manifest.json");
const ICONS_DIR = join(ROOT, "public", "icons");

/** Pre-theme-suffix duplicates — must not return after icons:generate cleanup. */
const FORBIDDEN_LEGACY_ICON_FILES = [
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
];

const REQUIRED_THEMED_ICON_FILES = [
  "iam-chrome-512-light.png",
  "iam-chrome-512-dark.png",
  "favicon-16-light.png",
  "favicon-16-dark.png",
  "favicon-32-light.png",
  "favicon-32-dark.png",
  "icon-192-light.png",
  "icon-192-dark.png",
  "icon-512-light.png",
  "icon-512-dark.png",
  "apple-touch-icon-light.png",
  "apple-touch-icon-dark.png",
  "og-image.png",
];
const MASTERS = {
  light: join(ROOT, "public", "brand", "iam-light.png"),
  dark: join(ROOT, "public", "brand", "iam-dark.png"),
};
const CHROME = {
  light: join(ROOT, "public", "icons", "iam-chrome-512-light.png"),
  dark: join(ROOT, "public", "icons", "iam-chrome-512-dark.png"),
};
const FAVICON_32 = {
  light: join(ROOT, "public", "icons", "favicon-32-light.png"),
  dark: join(ROOT, "public", "icons", "favicon-32-dark.png"),
};
const OG_IMAGE = join(ROOT, "public", "icons", "og-image.png");

const MIN_FAVICON_32_BYTES = 512;

function fail(message) {
  console.error(`check:brand-icons FAILED — ${message}`);
  process.exit(1);
}

async function main() {
  for (const filename of FORBIDDEN_LEGACY_ICON_FILES) {
    try {
      await stat(join(ICONS_DIR, filename));
      fail(
        `legacy duplicate ${filename} must be removed — use themed *-light.png / *-dark.png only`,
      );
    } catch {
      // expected: file absent
    }
  }

  for (const filename of REQUIRED_THEMED_ICON_FILES) {
    try {
      await stat(join(ICONS_DIR, filename));
    } catch {
      fail(`missing public/icons/${filename} — run npm run icons:generate`);
    }
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    fail("missing .brand-icons-manifest.json — run npm run icons:generate");
  }

  for (const theme of ["light", "dark"]) {
    const masterPath = MASTERS[theme];
    let masterBuffer;
    try {
      masterBuffer = await readFile(masterPath);
    } catch {
      fail(`missing public/brand/iam-${theme}.png`);
    }

    const hash = createHash("sha256").update(masterBuffer).digest("hex");
    const masterStat = await stat(masterPath);
    const expected = manifest.masters?.[theme];

    if (!expected) {
      fail(`manifest missing masters.${theme}`);
    }

    if (hash !== expected.sha256) {
      fail(
        `iam-${theme}.png hash mismatch — master edited after last icons:generate`,
      );
    }

    if (masterStat.size !== expected.size) {
      fail(
        `iam-${theme}.png size mismatch — master edited after last icons:generate`,
      );
    }

    let chromeMeta;
    try {
      chromeMeta = await sharp(await readFile(CHROME[theme])).metadata();
    } catch {
      fail(`missing iam-chrome-512-${theme}.png — run npm run icons:generate`);
    }

    if (chromeMeta.width !== 512 || chromeMeta.height !== 512) {
      fail(`iam-chrome-512-${theme}.png must be 512×512`);
    }

    if (!chromeMeta.hasAlpha) {
      fail(`iam-chrome-512-${theme}.png must have alpha`);
    }

    let faviconStat;
    try {
      faviconStat = await stat(FAVICON_32[theme]);
    } catch {
      fail(`missing favicon-32-${theme}.png — run npm run icons:generate`);
    }

    if (faviconStat.size < MIN_FAVICON_32_BYTES) {
      fail(`favicon-32-${theme}.png too small (${faviconStat.size} bytes)`);
    }
  }

  let ogMeta;
  try {
    ogMeta = await sharp(await readFile(OG_IMAGE)).metadata();
  } catch {
    fail("missing public/icons/og-image.png — run npm run icons:generate");
  }

  if (ogMeta.width !== 512 || ogMeta.height !== 512) {
    fail("og-image.png must be 512×512");
  }

  console.log("check:brand-icons OK");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
