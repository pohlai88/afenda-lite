/**
 * FFT UI registry — Layer A inventory + Layer B DNA (Vitest).
 * Complements: npm run check:fft-ui-registry (same auditUiRegistry SSOT).
 * Agents must not invent IDs or edit ui-registry.json to pass.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditUiRegistry,
  collectDiskInventory,
  evaluateDna,
  evaluateDnaMetadata,
  fftDnaMetadataNeedle,
  isBlockEntry,
  listProductTsx,
  loadRegistry,
  walkTsx,
} from "../../scripts/lib/fft-ui-registry-inventory.mjs";

const REPO_ROOT = join(import.meta.dirname, "../..");
const FEATURES_FFT = join(REPO_ROOT, "features/fft");
const APP_FFT = join(REPO_ROOT, "app/fft");

type RegistryPathRow = { path: string };

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

function walkAppTsx(dir: string): string[] {
  try {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkAppTsx(full));
      else if (entry.name.endsWith(".tsx")) out.push(full);
    }
    return out;
  } catch {
    return [];
  }
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
  const registry = loadRegistry(REPO_ROOT);
  const primitives = registry.primitives ?? [];
  const blocks = registry.blocks ?? [];
  const allRows = [...primitives, ...blocks, ...registry.components];
  const disk = collectDiskInventory(REPO_ROOT);

  it("auditUiRegistry SSOT passes (Layer A + Layer B)", () => {
    const result = auditUiRegistry(REPO_ROOT);
    expect(result.errors, result.errors.join("\n")).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.counts.primitives).toBeGreaterThan(0);
    expect(result.counts.blocks).toBeGreaterThan(0);
    expect(result.counts.surfaces).toBeGreaterThanOrEqual(2);
  });

  it("is version 3+ with AdminCN catalog arrays", () => {
    expect(registry.version).toBeGreaterThanOrEqual(3);
    expect(primitives.length).toBeGreaterThan(0);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("forbids pending rows in committed registry", () => {
    expect(allRows.filter((r) => r.status === "pending")).toEqual([]);
  });

  it("keeps reusableId and qaId unique across primitives, blocks, and products", () => {
    const reusable = allRows.map((c) => c.reusableId);
    const qa = allRows.map((c) => c.qaId);
    expect(new Set(reusable).size).toBe(reusable.length);
    expect(new Set(qa).size).toBe(qa.length);
  });

  it("matches disk inventory helpers to registered paths", () => {
    expect(
      (primitives as RegistryPathRow[]).map((p) => p.path).sort(),
    ).toEqual(disk.uiDisk);
    expect((blocks as RegistryPathRow[]).map((b) => b.path).sort()).toEqual(
      disk.blockDisk,
    );
    expect(
      (registry.components as RegistryPathRow[]).map((c) => c.path).sort(),
    ).toEqual(disk.tradeDisk);
    expect([...(registry.primitiveAllowlist ?? [])].sort()).toEqual(
      disk.allowlist,
    );
  });

  it("bans imports of forbidden registry paths from app/fft and features/fft", () => {
    const forbidden = allRows
      .filter((c) => c.status === "forbidden")
      .map((c) => c.path);

    const sources = [
      ...collectTsxSources(FEATURES_FFT),
      ...walkAppTsx(APP_FFT).map((abs) => ({
        path: toPosixRepoPath(abs),
        source: readFileSync(abs, "utf8"),
      })),
    ];

    for (const { path: filePath, source } of sources) {
      for (const forbiddenPath of forbidden) {
        const stem = forbiddenPath
          .replace(/^features\/fft\//, "")
          .replace(/\.tsx$/, "");
        for (const needle of [
          `@/features/fft/${stem}`,
          `features/fft/${stem}`,
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

  it("bans direct platform-views imports from features/fft (use ACN-BLK via HITL product wrap)", () => {
    for (const { path: filePath, source } of collectTsxSources(FEATURES_FFT)) {
      expect(
        PLATFORM_VIEWS.test(source),
        `${filePath} must not import components-V2/platform-views`,
      ).toBe(false);
    }
  });

  it("restricts UI primitive imports to primitiveAllowlist", () => {
    const allow = new Set(registry.primitiveAllowlist);
    for (const { path: filePath, source } of collectTsxSources(FEATURES_FFT)) {
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

  it("anti-hardcode scan on features/fft product tsx", () => {
    for (const { path: filePath, source } of collectTsxSources(FEATURES_FFT)) {
      expect(STYLE_ATTR.test(source), `${filePath} has style=`).toBe(false);
      expect(CSS_IMPORT.test(source), `${filePath} imports css`).toBe(false);
      expect(HEX_COLOR.test(source), `${filePath} has hex color`).toBe(false);
      expect(RGB_HSL.test(source), `${filePath} has rgb/hsl`).toBe(false);
    }
  });

  it("Layer B: EVT-LIST dna catches hand-rolled table regressions", () => {
    const fakeHandRolled = `
      import { FFT_NATIVE_SELECT_CLASS } from "@/features/fft/fft-form-controls";
      function toggleSort() {}
      applyFftEventListView(events, filters, sortKey, sortDir);
      <select className={FFT_NATIVE_SELECT_CLASS} />
    `;
    const evt = registry.components.find(
      (c: { reusableId: string }) => c.reusableId === "FFT-UI-EVT-LIST",
    );
    expect(evt?.dna).toBeTruthy();
    const errors = evaluateDna(fakeHandRolled, evt.dna);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e: string) => e.includes("bannedPattern"))).toBe(true);
    expect(errors.some((e: string) => e.includes("requiredPattern"))).toBe(
      true,
    );
  });

  it("Layer B: missing @fft-dna metadata is a violation", () => {
    const evt = registry.components.find(
      (c: { reusableId: string; requiredBlockId?: string }) =>
        c.reusableId === "FFT-UI-EVT-LIST",
    );
    expect(evt?.requiredBlockId).toBeTruthy();
    const needle = fftDnaMetadataNeedle(evt.requiredBlockId);
    const without = 'export function FftEventsList() { return null; }';
    expect(evaluateDnaMetadata(without, evt.requiredBlockId)).toEqual([
      `missing metadata pragma ${JSON.stringify(needle)} (add near file top)`,
    ]);
    expect(
      evaluateDnaMetadata(`/** ${needle} */\nexport function X() {}`, evt.requiredBlockId),
    ).toEqual([]);
  });

  it("shared isBlockEntry stays aligned with walk inventory", () => {
    const viewsRoot = join(REPO_ROOT, "components-V2/platform-views");
    const walked = walkTsx(viewsRoot)
      .map(toPosixRepoPath)
      .filter(isBlockEntry)
      .sort();
    expect(walked).toEqual(disk.blockDisk);
  });
});
