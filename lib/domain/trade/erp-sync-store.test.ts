import { describe, expect, it } from "vitest";
import { buildSyncIdempotencyKey } from "@/lib/domain/trade/erp-sync-store";

describe("buildSyncIdempotencyKey", () => {
  it("builds stable sync keys", () => {
    expect(buildSyncIdempotencyKey("order", "ord-1")).toBe("sync:order:ord-1:v1");
  });
});
