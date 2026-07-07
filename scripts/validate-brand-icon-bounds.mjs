import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const THEMES = ["light", "dark"];
const CHROME_SIZE = 512;
/** Minimum transparent margin from canvas edge to opaque content (px). */
const MIN_EDGE_MARGIN_PX = 4;

function fail(message) {
  console.error(`validate:brand-icon-bounds FAILED — ${message}`);
  process.exit(1);
}

async function alphaBoundingBox(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    return null;
  }

  return {
    left: minX,
    top: minY,
    right: width - 1 - maxX,
    bottom: height - 1 - maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function main() {
  const results = [];

  for (const theme of THEMES) {
    const path = join(ROOT, "public", "icons", `iam-chrome-512-${theme}.png`);
    let buffer;
    try {
      buffer = await readFile(path);
    } catch {
      fail(`missing iam-chrome-512-${theme}.png — run npm run icons:generate`);
    }

    const meta = await sharp(buffer).metadata();
    if (meta.width !== CHROME_SIZE || meta.height !== CHROME_SIZE) {
      fail(`iam-chrome-512-${theme}.png must be ${CHROME_SIZE}×${CHROME_SIZE}`);
    }

    const bbox = await alphaBoundingBox(buffer);
    if (!bbox) {
      fail(`iam-chrome-512-${theme}.png has no opaque pixels`);
    }

    const margins = {
      left: bbox.left,
      top: bbox.top,
      right: bbox.right,
      bottom: bbox.bottom,
    };
    const minMargin = Math.min(
      margins.left,
      margins.top,
      margins.right,
      margins.bottom,
    );
    const pass = minMargin >= MIN_EDGE_MARGIN_PX;

    results.push({
      theme,
      path: `public/icons/iam-chrome-512-${theme}.png`,
      contentBox: { width: bbox.width, height: bbox.height },
      margins,
      minMarginPx: minMargin,
      requiredMinMarginPx: MIN_EDGE_MARGIN_PX,
      pass,
    });

    if (!pass) {
      fail(
        `iam-chrome-512-${theme}.png content bleeds to edge (min margin ${minMargin}px < ${MIN_EDGE_MARGIN_PX}px)`,
      );
    }
  }

  console.log("validate:brand-icon-bounds OK");
  for (const row of results) {
    console.log(
      `  ${row.theme}: content ${row.contentBox.width}×${row.contentBox.height}px, margins L${row.margins.left} T${row.margins.top} R${row.margins.right} B${row.margins.bottom}`,
    );
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
