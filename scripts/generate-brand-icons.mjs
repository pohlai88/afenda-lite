import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_DIR = join(ROOT, "public", "brand", "identity");
const PUBLIC_ICONS = join(ROOT, "public", "icons");
const MANIFEST_PATH = join(PUBLIC_ICONS, ".brand-icons-manifest.json");

const MASTERS = {
  light: join(BRAND_DIR, "iam-light.png"),
  dark: join(BRAND_DIR, "iam-dark.png"),
};

const BRAND_RENDER_SIZE = 512;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const THEMES = ["light", "dark"];

const VARIANTS = [
  { name: "iam-chrome-512-{theme}.png", size: 512, fit: "contain", edgePadding: 24 },
  { name: "favicon-16-{theme}.png", size: 16, sharpen: true, fit: "contain", edgePadding: 1 },
  { name: "favicon-32-{theme}.png", size: 32, sharpen: true, fit: "contain", edgePadding: 2 },
  { name: "icon-192-{theme}.png", size: 192, fit: "contain", edgePadding: 8 },
  { name: "icon-512-{theme}.png", size: 512, fit: "contain", edgePadding: 24 },
  { name: "apple-touch-icon-{theme}.png", size: 180, fit: "contain", edgePadding: 8 },
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function trimBuffer(buffer) {
  return sharp(buffer).trim().png().toBuffer();
}

async function resizeToSquare(
  buffer,
  size,
  { sharpen = false, fit = "cover", edgePadding = 0 } = {},
) {
  const inner = Math.max(1, size - edgePadding * 2);

  let content = sharp(buffer).resize(inner, inner, {
    fit,
    position: "centre",
    background: TRANSPARENT,
    kernel: sharp.kernel.lanczos3,
  });

  if (sharpen) {
    content = content.sharpen({ sigma: 0.5 });
  }

  const contentBuffer = await content
    .png({ compressionLevel: size <= 32 ? 0 : 9, effort: size <= 32 ? 1 : 7 })
    .toBuffer();

  if (edgePadding === 0) {
    return contentBuffer;
  }

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: contentBuffer, gravity: "centre" }])
    .png({ compressionLevel: size <= 32 ? 0 : 9, effort: size <= 32 ? 1 : 7 })
    .toBuffer();
}

async function main() {
  const masterHashes = {};
  const masterSizes = {};
  const trimmedByTheme = {};

  for (const theme of THEMES) {
    const path = MASTERS[theme];
    const sourceBuffer = await readFile(path);
    masterHashes[theme] = sha256(sourceBuffer);
    masterSizes[theme] = (await stat(path)).size;
    trimmedByTheme[theme] = await trimBuffer(sourceBuffer);
  }

  await mkdir(PUBLIC_ICONS, { recursive: true });

  for (const theme of THEMES) {
    const trimmed = trimmedByTheme[theme];

    for (const variant of VARIANTS) {
      const filename = variant.name.replace("{theme}", theme);
      const png = await resizeToSquare(trimmed, variant.size, {
        sharpen: variant.sharpen,
        fit: variant.fit ?? "cover",
        edgePadding: variant.edgePadding ?? 0,
      });
      await writeFile(join(PUBLIC_ICONS, filename), png);
      console.log(
        `  ${filename} (${variant.size}px) → ${(png.length / 1024).toFixed(1)} KB`,
      );
    }
  }

  const lightOg = await readFile(join(PUBLIC_ICONS, "icon-512-light.png"));

  await writeFile(join(PUBLIC_ICONS, "og-image.png"), lightOg);
  console.log("  public/icons/og-image.png");

  for (const theme of THEMES) {
    const path = MASTERS[theme];
    const after = sha256(await readFile(path));
    if (after !== masterHashes[theme]) {
      throw new Error(`${path} was modified during generation — aborting`);
    }
  }

  const manifest = {
    masters: {
      light: {
        path: "public/brand/identity/iam-light.png",
        sha256: masterHashes.light,
        size: masterSizes.light,
      },
      dark: {
        path: "public/brand/identity/iam-dark.png",
        sha256: masterHashes.dark,
        size: masterSizes.dark,
      },
    },
    generatedAt: new Date().toISOString(),
  };

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  const webManifest = {
    name: "Client Declaration Portal",
    short_name: "CDP",
    icons: [
      {
        src: "/icons/icon-192-dark.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-dark.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#0F172A",
    background_color: "#0F172A",
    display: "standalone",
  };

  await writeFile(
    join(ROOT, "public", "site.webmanifest"),
    `${JSON.stringify(webManifest, null, 2)}\n`,
  );
  console.log("  site.webmanifest");
  console.log("  .brand-icons-manifest.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
