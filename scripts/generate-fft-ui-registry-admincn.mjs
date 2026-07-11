/**
 * One-shot / maintainable generator for FFT ui-registry AdminCN catalog.
 * Usage: node scripts/generate-fft-ui-registry-admincn.mjs
 * Does NOT invent product FFT-UI rows — merges existing components from current JSON.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY = path.join(
  ROOT,
  ".cursor/skills/feed-farm-trade/ui-registry.json",
);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

function posix(p) {
  return p.split(path.sep).join("/");
}

function slugSegment(rel, stripPrefix) {
  return rel
    .replace(stripPrefix, "")
    .replace(/\.tsx$/, "")
    .replace(/\/index$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

const existing = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));

const HITL = {
  evidenceRef: "AdminCN catalog seed — components-V2 inventory 2026-07-11",
  approvedBy: "owner",
  approvedAt: "2026-07-11",
  status: "approved",
};

const uiDir = path.join(ROOT, "components-V2/platform-components/ui");
const uiFiles = fs.readdirSync(uiDir).filter((f) => f.endsWith(".tsx"));
const primitives = uiFiles
  .map((f) => {
    const base = f.replace(/\.tsx$/, "");
    const rel = posix(path.join("components-V2/platform-components/ui", f));
    const reusableId = `ACN-UI-${base.replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase()}`;
    return {
      reusableId,
      qaId: `ACN-QA-2026-07-11-${reusableId.replace(/^ACN-UI-/, "")}`,
      evidenceRef: HITL.evidenceRef,
      approvedBy: HITL.approvedBy,
      approvedAt: HITL.approvedAt,
      status: HITL.status,
      kind: "primitive",
      path: rel,
      studioSource: rel,
      notes:
        "AdminCN UI primitive — auto-import OK from features/trade when on primitiveAllowlist",
    };
  })
  .sort((a, b) => a.reusableId.localeCompare(b.reusableId));

const viewsRoot = path.join(ROOT, "components-V2/platform-views");
const allTsx = walk(viewsRoot).map((abs) =>
  posix(path.relative(ROOT, abs)),
);

function isBlockEntry(rel) {
  const base = path.posix.basename(rel);
  if (base === "index.tsx") return true;
  if (base.startsWith("datatable-")) return true;
  if (rel.includes("/dashboards/") && base.endsWith(".tsx")) return true;
  if (rel.includes("/portal-views/") && base.endsWith(".tsx")) return true;
  return false;
}

const idSeen = new Set();
const blocks = [];
for (const relRaw of allTsx.filter(isBlockEntry).sort()) {
  const rel = relRaw.replace(/\\/g, "/");
  let id = `ACN-BLK-${slugSegment(rel, "components-V2/platform-views/")}`;
  if (idSeen.has(id)) {
    id = `${id}-${Buffer.from(rel).toString("hex").slice(0, 4).toUpperCase()}`;
  }
  idSeen.add(id);

  const isPortal = rel.includes("/portal-views/");
  const isAuthDemo = rel.includes("/pages/auth/");
  let notes =
    "AdminCN demo/DNA block — adapt into features/* only with product reusableId HITL; do not bulk-wire demos";
  if (isAuthDemo) {
    notes =
      "Demo DNA only — do not replace Neon Auth on /auth or /account";
  } else if (isPortal) {
    notes =
      "Product portal-view — Declarations surfaces; FFT must not import without HITL product id";
  }

  blocks.push({
    reusableId: id,
    qaId: `ACN-QA-2026-07-11-${id.replace(/^ACN-BLK-/, "").slice(0, 56)}`,
    evidenceRef: HITL.evidenceRef,
    approvedBy: HITL.approvedBy,
    approvedAt: HITL.approvedAt,
    status: HITL.status,
    kind: "block",
    path: rel,
    studioSource: rel,
    notes,
  });
}

const qaSeen = new Set();
for (const row of [...primitives, ...blocks]) {
  let q = row.qaId;
  let n = 0;
  while (qaSeen.has(q)) {
    n += 1;
    q = `${row.qaId}-${n}`;
  }
  row.qaId = q;
  qaSeen.add(q);
}

const components = (existing.components ?? []).map((c) => ({
  ...c,
  kind: c.kind || "product",
}));

const out = {
  version: 2,
  updated: "2026-07-11",
  notes: [
    "Human-only edits for approved/forbidden rows.",
    "Agents must not invent reusableIds or self-approve to green Vitest.",
    "ACN-UI-* primitives: import from components-V2/platform-components/ui when on primitiveAllowlist.",
    "ACN-BLK-* blocks: catalog DNA — do not import platform-views from features/trade; wrap via product FFT-UI-* HITL.",
    "Registry pass ≠ visual quality claim.",
    "TRADE_NATIVE_* tech-debt (P2-AC-05); not failed by Vitest in v1.",
    "Regenerate AdminCN catalog: node scripts/generate-fft-ui-registry-admincn.mjs (preserves components[]).",
  ],
  primitiveAllowlist: primitives
    .map((p) => path.basename(p.path, ".tsx"))
    .sort(),
  primitives,
  blocks,
  components,
};

fs.writeFileSync(REGISTRY, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      primitives: primitives.length,
      blocks: blocks.length,
      components: components.length,
      allowlist: out.primitiveAllowlist.length,
    },
    null,
    2,
  ),
);
