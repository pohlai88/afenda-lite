import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  API_ROUTE_ACTION_IDS,
  CLIENT_DECLARATION_DRAFT_API_HREF,
  HEALTH_LIVENESS_API_HREF,
  HEALTH_READINESS_API_HREF,
  POST_CLIENT_DECLARATION_DRAFT_API_ACTION,
} from "@/lib/api/routes";

const REPO_ROOT = join(import.meta.dirname, "../..");

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

  it("maps keepalive API constants to reliance action ids", () => {
    expect(POST_CLIENT_DECLARATION_DRAFT_API_ACTION).toBe(
      "postClientDeclarationDraftApi",
    );
    expect(API_ROUTE_ACTION_IDS.CLIENT_DECLARATION_DRAFT_API_HREF).toBe(
      "action:postClientDeclarationDraftApi",
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
    ).toContain("runPostClientDeclarationDraft");
  });
});
