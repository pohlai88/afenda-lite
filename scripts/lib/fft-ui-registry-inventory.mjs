/**
 * Shared FFT UI registry inventory + DNA helpers.
 * Used by: generate-fft-ui-registry-admincn.mjs, check-fft-ui-registry.mjs, Vitest.
 */
import fs from "node:fs";
import path from "node:path";

export function toPosix(p) {
  return String(p).split(path.sep).join("/");
}

export function registryFile(root) {
  return path.join(root, ".cursor/skills/feed-farm-trade/ui-registry.json");
}

export function loadRegistry(root) {
  return JSON.parse(fs.readFileSync(registryFile(root), "utf8"));
}

export function walkTsx(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsx(full, acc);
    else if (entry.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

export function listProductTsx(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listProductTsx(full, acc);
      continue;
    }
    if (!entry.name.endsWith(".tsx")) continue;
    if (entry.name.includes(".test.")) continue;
    acc.push(full);
  }
  return acc;
}

export function isBlockEntry(relPosix) {
  const base = relPosix.split("/").pop() ?? "";
  if (base === "index.tsx") return true;
  if (base.startsWith("datatable-")) return true;
  if (relPosix.includes("/dashboards/") && base.endsWith(".tsx")) return true;
  if (relPosix.includes("/portal-views/") && base.endsWith(".tsx")) return true;
  return false;
}

export function diffLists(disk, registered) {
  const diskSet = new Set(disk);
  const regSet = new Set(registered);
  return {
    missingInReg: disk.filter((x) => !regSet.has(x)),
    extraInReg: registered.filter((x) => !diskSet.has(x)),
  };
}

export function collectDiskInventory(root) {
  const uiDir = path.join(root, "components-V2/platform-components/ui");
  const viewsRoot = path.join(root, "components-V2/platform-views");
  const featuresFft = path.join(root, "features/fft");

  const uiDisk = fs
    .readdirSync(uiDir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `components-V2/platform-components/ui/${f}`)
    .sort();

  const blockDisk = walkTsx(viewsRoot)
    .map((abs) => toPosix(path.relative(root, abs)))
    .filter(isBlockEntry)
    .sort();

  let tradeDisk = [];
  try {
    tradeDisk = listProductTsx(featuresFft)
      .map((abs) => toPosix(path.relative(root, abs)))
      .sort();
  } catch {
    tradeDisk = [];
  }

  const allowlist = uiDisk
    .map((p) => path.basename(p, ".tsx"))
    .sort();

  return { uiDisk, blockDisk, tradeDisk, allowlist };
}

/**
 * @param {string} source
 * @param {{ requiredPatterns?: string[]; bannedPatterns?: string[] } | null | undefined} dna
 * @returns {string[]}
 */
export function evaluateDna(source, dna) {
  if (!dna) return [];
  const errors = [];
  for (const needle of dna.requiredPatterns ?? []) {
    if (!source.includes(needle)) {
      errors.push(`missing requiredPattern ${JSON.stringify(needle)}`);
    }
  }
  for (const needle of dna.bannedPatterns ?? []) {
    if (source.includes(needle)) {
      errors.push(`hit bannedPattern ${JSON.stringify(needle)}`);
    }
  }
  return errors;
}

/** File-level DNA claim — must match registry requiredBlockId. */
export function fftDnaMetadataNeedle(requiredBlockId) {
  return `@fft-dna ${requiredBlockId}`;
}

/**
 * @param {string} source
 * @param {string | null | undefined} requiredBlockId
 * @returns {string[]}
 */
export function evaluateDnaMetadata(source, requiredBlockId) {
  if (!requiredBlockId) return [];
  const needle = fftDnaMetadataNeedle(requiredBlockId);
  if (!source.includes(needle)) {
    return [
      `missing metadata pragma ${JSON.stringify(needle)} (add near file top)`,
    ];
  }
  return [];
}

/**
 * Layer A inventory drift + Layer B DNA / surface contracts.
 * @returns {{ ok: boolean; errors: string[]; counts: Record<string, number> }}
 */
export function auditUiRegistry(root = process.cwd()) {
  const registry = loadRegistry(root);
  const disk = collectDiskInventory(root);
  const primitives = registry.primitives ?? [];
  const blocks = registry.blocks ?? [];
  const components = registry.components ?? [];
  const surfaces = registry.surfaces ?? [];
  const allRows = [...primitives, ...blocks, ...components];
  const errors = [];

  if ((registry.version ?? 0) < 3) {
    errors.push(`version must be >= 3 (got ${registry.version})`);
  }

  const pending = allRows.filter((r) => r.status === "pending");
  if (pending.length) {
    errors.push(`pending rows not allowed: ${pending.map((r) => r.reusableId).join(", ")}`);
  }

  for (const row of allRows) {
    if (row.status !== "approved") continue;
    for (const field of [
      "reusableId",
      "qaId",
      "evidenceRef",
      "approvedBy",
      "approvedAt",
    ]) {
      if (!String(row[field] ?? "").trim()) {
        errors.push(`${row.path ?? row.reusableId}: empty ${field}`);
      }
    }
    if (row.approvedAt && !/^\d{4}-\d{2}-\d{2}/.test(String(row.approvedAt))) {
      errors.push(`${row.reusableId}: approvedAt must be YYYY-MM-DD`);
    }
  }

  const reusable = allRows.map((r) => r.reusableId);
  const qa = allRows.map((r) => r.qaId);
  if (new Set(reusable).size !== reusable.length) {
    errors.push("duplicate reusableId");
  }
  if (new Set(qa).size !== qa.length) {
    errors.push("duplicate qaId");
  }

  for (const row of primitives) {
    if (!String(row.reusableId).startsWith("ACN-UI-")) {
      errors.push(`${row.reusableId}: primitive must use ACN-UI- prefix`);
    }
  }
  for (const row of blocks) {
    if (!String(row.reusableId).startsWith("ACN-BLK-")) {
      errors.push(`${row.reusableId}: block must use ACN-BLK- prefix`);
    }
  }
  for (const row of components) {
    if (!String(row.reusableId).startsWith("FFT-UI-")) {
      errors.push(`${row.reusableId}: product must use FFT-UI- prefix`);
    }
  }

  const uiDiff = diffLists(
    disk.uiDisk,
    primitives.map((p) => p.path).sort(),
  );
  const blkDiff = diffLists(
    disk.blockDisk,
    blocks.map((b) => b.path).sort(),
  );
  const tradeDiff = diffLists(
    disk.tradeDisk,
    components.map((c) => c.path).sort(),
  );

  for (const miss of uiDiff.missingInReg) {
    errors.push(`primitive missing in registry: ${miss}`);
  }
  for (const extra of uiDiff.extraInReg) {
    errors.push(`primitive extra in registry: ${extra}`);
  }
  for (const miss of blkDiff.missingInReg) {
    errors.push(`block missing in registry: ${miss}`);
  }
  for (const extra of blkDiff.extraInReg) {
    errors.push(`block extra in registry: ${extra}`);
  }
  for (const miss of tradeDiff.missingInReg) {
    errors.push(`product missing in registry: ${miss}`);
  }
  for (const extra of tradeDiff.extraInReg) {
    errors.push(`product extra in registry: ${extra}`);
  }

  const allowReg = [...(registry.primitiveAllowlist ?? [])].sort();
  if (allowReg.join("\0") !== disk.allowlist.join("\0")) {
    errors.push("primitiveAllowlist drift vs disk");
  }

  const blockById = new Map(blocks.map((b) => [b.reusableId, b]));

  for (const row of components) {
    if (row.requiredBlockId) {
      const block = blockById.get(row.requiredBlockId);
      if (!block) {
        errors.push(
          `${row.reusableId}: requiredBlockId ${row.requiredBlockId} not in blocks[]`,
        );
      } else if (row.studioSource !== block.path) {
        errors.push(
          `${row.reusableId}: studioSource must equal required block path (${block.path})`,
        );
      }
    }

    if (row.dna || row.requiredBlockId) {
      const abs = path.join(root, row.path);
      if (!fs.existsSync(abs)) {
        errors.push(`${row.reusableId}: path missing on disk ${row.path}`);
        continue;
      }
      const source = fs.readFileSync(abs, "utf8");
      for (const err of evaluateDna(source, row.dna)) {
        errors.push(`${row.reusableId} (${row.path}): ${err}`);
      }
      for (const err of evaluateDnaMetadata(source, row.requiredBlockId)) {
        errors.push(`${row.reusableId} (${row.path}): ${err}`);
      }
    }
  }

  for (const surface of surfaces) {
    const abs = path.join(root, surface.path);
    if (!fs.existsSync(abs)) {
      errors.push(`surface missing on disk: ${surface.path}`);
      continue;
    }
    const source = fs.readFileSync(abs, "utf8");
    for (const err of evaluateDna(source, {
      requiredPatterns: surface.requiredPatterns,
      bannedPatterns: surface.bannedPatterns,
    })) {
      errors.push(`surface ${surface.path}: ${err}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    counts: {
      primitives: primitives.length,
      blocks: blocks.length,
      components: components.length,
      surfaces: surfaces.length,
      allowlist: allowReg.length,
    },
  };
}
