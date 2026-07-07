import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public", "brandicondisk.png");
const PUBLIC_ICONS = join(ROOT, "public", "icons");
const APP_DIR = join(ROOT, "app");

const VARIANTS = [
  { name: "favicon-16.png", size: 16, dir: PUBLIC_ICONS },
  { name: "favicon-32.png", size: 32, dir: PUBLIC_ICONS },
  { name: "icon-192.png", size: 192, dir: PUBLIC_ICONS },
  { name: "icon-512.png", size: 512, dir: PUBLIC_ICONS },
  { name: "apple-touch-icon.png", size: 180, dir: PUBLIC_ICONS },
  { name: "og-image.png", size: 512, dir: PUBLIC_ICONS },
  { name: "icon.png", size: 32, dir: APP_DIR },
  { name: "apple-icon.png", size: 180, dir: APP_DIR },
  { name: "opengraph-image.png", size: 512, dir: APP_DIR },
];

async function writePng(buffer, outputPath, size) {
  const png = await sharp(buffer)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();

  await writeFile(outputPath, png);
  return png.length;
}

async function main() {
  const sourceBuffer = await readFile(SOURCE);
  await mkdir(PUBLIC_ICONS, { recursive: true });

  const compressed512Path = join(ROOT, "public", "brandicondisk.png");
  const compressed512Bytes = await writePng(
    sourceBuffer,
    compressed512Path,
    512,
  );

  console.log(
    `Compressed brandicondisk.png → 512×512 (${(compressed512Bytes / 1024).toFixed(1)} KB)`,
  );

  for (const variant of VARIANTS) {
    const bytes = await writePng(
      sourceBuffer,
      join(variant.dir, variant.name),
      variant.size,
    );
    console.log(
      `  ${variant.name} (${variant.size}px) → ${(bytes / 1024).toFixed(1)} KB`,
    );
  }

  const manifest = {
    name: "Client Declaration Portal",
    short_name: "CDP",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };

  await writeFile(
    join(ROOT, "public", "site.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log("  site.webmanifest");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
