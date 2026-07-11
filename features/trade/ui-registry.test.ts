/**
 * FFT UI registry fail-fast — product FFT-UI-* + AdminCN ACN-UI-* / ACN-BLK-*.
 * Agents must not invent IDs or edit ui-registry.json to pass.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(import.meta.dirname, "../..");
const REGISTRY_PATH = join(
  REPO_ROOT,
  ".cursor/skills/feed-farm-trade/ui-registry.json",
);
const FEATURES_TRADE = join(REPO_ROOT, "features/trade");
const APP_TRADE = join(REPO_ROOT, "app/trade");
const UI_DIR = join(REPO_ROOT, "components-V2/platform-components/ui");
const VIEWS_ROOT = join(REPO_ROOT, "components-V2/platform-views");

type RegistryRow = {
  reusableId: string;
  qaId: string;
  evidenceRef: string;
  approvedBy: string;
  approvedAt: string;
  status: "approved" | "forbidden" | "pending";
  kind?: "primitive" | "block" | "product";
  path: string;
  studioSource: string | null;
  notes: string | null;
};

type UiRegistry = {
  version: number;
  primitiveAllowlist: string[];
  primitives?: RegistryRow[];
  blocks?: RegistryRow[];
  components: RegistryRow[];
};

function loadRegistry(): UiRegistry {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as UiRegistry;
}

function listProductTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listProductTsx(full));
      continue;
    }
    if (!entry.name.endsWith(".tsx")) continue;
    if (entry.name.includes(".test.")) continue;
    out.push(full);
  }
  return out;
}

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsx(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function toPosixRepoPath(abs: string): string {
  return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

function collectTsxSources(root: string): { path: string; source: string }[] {
  try {
    return listProductTsx(root).map((abs) => ({
      path: toPosixRepoPath(abs),
      source: readFileSync(abs, "utf8"),
    }));
  } catch {
    return [];
  }
}

function isBlockEntry(rel: string): boolean {
  const base = rel.split("/").pop() ?? "";
  if (base === "index.tsx") return true;
  if (base.startsWith("datatable-")) return true;
  if (rel.includes("/dashboards/") && base.endsWith(".tsx")) return true;
  if (rel.includes("/portal-views/") && base.endsWith(".tsx")) return true;
  return false;
}

function assertApprovedHitl(row: RegistryRow) {
  if (row.status !== "approved") return;
  expect(row.reusableId.trim(), row.path).not.toBe("");
  expect(row.qaId.trim(), row.path).not.toBe("");
  expect(row.evidenceRef.trim(), row.path).not.toBe("");
  expect(row.approvedBy.trim(), row.path).not.toBe("");
  expect(row.approvedAt.trim(), row.path).not.toBe("");
  expect(row.approvedAt, row.path).toMatch(/^\d{4}-\d{2}-\d{2}/);
}

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_HSL = /\b(?:rgb|hsl)a?\(/i;
const STYLE_ATTR = /\bstyle\s*=/;
const CSS_IMPORT =
  /from\s+["'][^"']+\.module\.css["']|from\s+["'][^"']+\.css["']/;
const PLATFORM_VIEWS = /@\/components-V2\/platform-views\//;
const UI_IMPORT =
  /from\s+["']@\/components-V2\/platform-components\/ui\/([^"']+)["']/g;

describe("FFT UI registry", () => {
  const registry = loadRegistry();
  const primitives = registry.primitives ?? [];
  const blocks = registry.blocks ?? [];
  const allRows = [...primitives, ...blocks, ...registry.components];

  it("is version 2+ with AdminCN catalog arrays", () => {
    expect(registry.version).toBeGreaterThanOrEqual(2);
    expect(primitives.length).toBeGreaterThan(0);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("forbids pending rows in committed registry", () => {
    expect(allRows.filter((r) => r.status === "pending")).toEqual([]);
  });

  it("requires dual IDs + evidence triad on every approved row", () => {
    for (const row of allRows) assertApprovedHitl(row);
  });

  it("keeps reusableId and qaId unique across primitives, blocks, and products", () => {
    const reusable = allRows.map((c) => c.reusableId);
    const qa = allRows.map((c) => c.qaId);
    expect(new Set(reusable).size).toBe(reusable.length);
    expect(new Set(qa).size).toBe(qa.length);
  });

  it("registers every AdminCN UI primitive file", () => {
    const disk = readdirSync(UI_DIR)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => `components-V2/platform-components/ui/${f}`)
      .sort();
    const registered = primitives.map((p) => p.path).sort();
    expect(registered).toEqual(disk);
    expect(registry.primitiveAllowlist.sort()).toEqual(
      disk.map((p) => p.split("/").pop()!.replace(/\.tsx$/, "")).sort(),
    );
  });

  it("registers every AdminCN platform-views block entry", () => {
    const disk = walkTsx(VIEWS_ROOT)
      .map(toPosixRepoPath)
      .filter(isBlockEntry)
      .sort();
    const registered = blocks.map((b) => b.path).sort();
    expect(registered).toEqual(disk);
  });

  it("covers every features/trade product tsx exactly once", () => {
    const disk = listProductTsx(FEATURES_TRADE).map(toPosixRepoPath).sort();
    const registered = registry.components.map((c) => c.path).sort();
    expect(registered).toEqual(disk);
  });

  it("bans imports of forbidden registry paths from app/trade and features/trade", () => {
    const forbidden = allRows
      .filter((c) => c.status === "forbidden")
      .map((c) => c.path);

    const sources = [
      ...collectTsxSources(FEATURES_TRADE),
      ...collectTsxSources(APP_TRADE),
    ];

    for (const { path: filePath, source } of sources) {
      for (const forbiddenPath of forbidden) {
        const stem = forbiddenPath
          .replace(/^features\/trade\//, "")
          .replace(/\.tsx$/, "");
        for (const needle of [
          `@/features/trade/${stem}`,
          `features/trade/${stem}`,
          `@/${forbiddenPath.replace(/\.tsx$/, "")}`,
        ]) {
          expect(
            source.includes(needle),
            `${filePath} must not import forbidden ${needle}`,
          ).toBe(false);
        }
      }
    }
  });

  it("bans direct platform-views imports from features/trade (use ACN-BLK via HITL product wrap)", () => {
    for (const { path: filePath, source } of collectTsxSources(FEATURES_TRADE)) {
      expect(
        PLATFORM_VIEWS.test(source),
        `${filePath} must not import components-V2/platform-views`,
      ).toBe(false);
    }
  });

  it("restricts UI primitive imports to primitiveAllowlist", () => {
    const allow = new Set(registry.primitiveAllowlist);
    for (const { path: filePath, source } of collectTsxSources(FEATURES_TRADE)) {
      UI_IMPORT.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = UI_IMPORT.exec(source)) !== null) {
        const spec = match[1] ?? "";
        const base = spec.split("/")[0]?.replace(/\.tsx$/, "") ?? "";
        expect(
          allow.has(base),
          `${filePath} imports ui/${base} which is not on primitiveAllowlist`,
        ).toBe(true);
      }
    }
  });

  it("anti-hardcode scan on features/trade product tsx", () => {
    for (const { path: filePath, source } of collectTsxSources(FEATURES_TRADE)) {
      expect(STYLE_ATTR.test(source), `${filePath} has style=`).toBe(false);
      expect(CSS_IMPORT.test(source), `${filePath} imports css`).toBe(false);
      expect(HEX_COLOR.test(source), `${filePath} has hex color`).toBe(false);
      expect(RGB_HSL.test(source), `${filePath} has rgb/hsl`).toBe(false);
    }
  });
});
