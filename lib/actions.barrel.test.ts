import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SESSION_HELPER_ACTIONS } from "@/lib/surface-entry-points";
import { listExportedActionIds } from "@/lib/portal-reliance-scan";

const REPO_ROOT = join(import.meta.dirname, "..");
const ACTION_FILES = [
  "admin.ts",
  "account.ts",
  "client.ts",
  "declarations.ts",
  "surveys.ts",
] as const;

describe("app/actions barrels", () => {
  it("does not re-export session helpers from use server barrels", () => {
    const adminSource = readFileSync(
      join(REPO_ROOT, "app/actions/admin.ts"),
      "utf8",
    );
    const clientSource = readFileSync(
      join(REPO_ROOT, "app/actions/client.ts"),
      "utf8",
    );
    const accountSource = readFileSync(
      join(REPO_ROOT, "app/actions/account.ts"),
      "utf8",
    );

    expect(adminSource).not.toMatch(/export \{ requireAdminSession \}/);
    expect(clientSource).not.toMatch(/export \{ requireClientSession \}/);
    expect(accountSource).not.toMatch(/export \{ requireAccountSession \}/);
    expect(accountSource.startsWith('"use server";')).toBe(true);
  });

  it("tracks session helpers from lib session modules in reliance scan", () => {
    const exports = listExportedActionIds(REPO_ROOT);

    expect(exports).toContain(SESSION_HELPER_ACTIONS.requireAdminSession);
    expect(exports).toContain(SESSION_HELPER_ACTIONS.requireClientSession);
    expect(exports).toContain(SESSION_HELPER_ACTIONS.requireAccountSession);
  });

  it('marks every app/actions module with "use server"', () => {
    for (const file of ACTION_FILES) {
      const source = readFileSync(join(REPO_ROOT, "app/actions", file), "utf8");
      expect(source.startsWith('"use server";'), file).toBe(true);
    }
  });
});
