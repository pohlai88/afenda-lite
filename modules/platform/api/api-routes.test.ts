import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  API_ROUTE_ACTION_IDS,
  CLIENT_DECLARATION_DRAFT_API_HREF,
  HEALTH_LIVENESS_API_HREF,
  HEALTH_READINESS_API_HREF,
  WRITE_CLIENT_DECLARATION_DRAFT_API_ACTION,
} from "@/modules/platform/api/routes";

const REPO_ROOT = join(import.meta.dirname, "../../..");

const API_ROUTE_FILES = [
  "app/api/auth/[...path]/route.ts",
  "app/api/health/liveness/route.ts",
  "app/api/health/readiness/route.ts",
  "app/api/client/declaration-draft/route.ts",
] as const;

describe("lib/api/routes", () => {
  it("exposes canonical API href constants", () => {
    expect(HEALTH_LIVENESS_API_HREF).toBe("/api/health/liveness");
    expect(HEALTH_READINESS_API_HREF).toBe("/api/health/readiness");
    expect(CLIENT_DECLARATION_DRAFT_API_HREF).toBe(
      "/api/client/declaration-draft",
    );
  });

  it("maps draft API constants to reliance action ids", () => {
    expect(WRITE_CLIENT_DECLARATION_DRAFT_API_ACTION).toBe(
      "writeClientDeclarationDraftApi",
    );
    expect(API_ROUTE_ACTION_IDS.CLIENT_DECLARATION_DRAFT_API_HREF).toBe(
      "action:writeClientDeclarationDraftApi",
    );
  });
});

describe("app/api route segments", () => {
  it("declares nodejs runtime and force-dynamic on operational routes", () => {
    for (const file of API_ROUTE_FILES) {
      const source = readFileSync(join(REPO_ROOT, file), "utf8");
      expect(source, file).toContain('export const runtime = "nodejs"');
      expect(source, file).toContain('export const dynamic = "force-dynamic"');
    }
  });

  it("delegates handler logic to lib/api serialized route modules", () => {
    expect(
      readFileSync(
        join(REPO_ROOT, "app/api/health/liveness/route.ts"),
        "utf8",
      ),
    ).toContain("runHealthLivenessGet");
    expect(
      readFileSync(
        join(REPO_ROOT, "app/api/health/readiness/route.ts"),
        "utf8",
      ),
    ).toContain("runHealthReadinessGet");
    expect(
      readFileSync(
        join(REPO_ROOT, "app/api/client/declaration-draft/route.ts"),
        "utf8",
      ),
    ).toContain("runWriteClientDeclarationDraft");
    expect(
      readFileSync(
        join(REPO_ROOT, "app/api/client/declaration-draft/route.ts"),
        "utf8",
      ),
    ).toContain("runGetClientDeclarationDraft");
  });
});
