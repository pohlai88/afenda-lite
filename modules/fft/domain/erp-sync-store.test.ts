import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  isFftErpSyncEnabled: vi.fn(),
}));

vi.mock("@/modules/platform/db", () => ({
  pool: {
    query: mocks.query,
  },
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isFftErpSyncEnabled: mocks.isFftErpSyncEnabled,
}));

import { buildSyncIdempotencyKey, retrySyncJob } from "@/modules/fft/domain/erp-sync-store";

describe("buildSyncIdempotencyKey", () => {
  it("builds stable sync keys", () => {
    expect(buildSyncIdempotencyKey("order", "ord-1")).toBe("sync:order:ord-1:v1");
  });
});

describe("retrySyncJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("performs no SQL UPDATE when FFT_ERP_SYNC_ENABLED is false", async () => {
    mocks.isFftErpSyncEnabled.mockReturnValue(false);

    const result = await retrySyncJob("job-1");

    expect(result).toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns failed/dead jobs to pending when flag is on", async () => {
    mocks.isFftErpSyncEnabled.mockReturnValue(true);
    const now = new Date("2026-07-11T12:00:00.000Z");
    mocks.query.mockResolvedValue({
      rows: [
        {
          id: "job-1",
          job_type: "order",
          entity_id: "ord-1",
          idempotency_key: "sync:order:ord-1:v1",
          status: "pending",
          attempt_count: 2,
          scheduled_at: now.toISOString(),
          last_error: null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ],
    });

    const result = await retrySyncJob("job-1");

    expect(mocks.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mocks.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("UPDATE fft_sync_job");
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("status IN ('failed', 'dead')");
    expect(params).toEqual(["job-1"]);
    expect(result).toMatchObject({
      id: "job-1",
      status: "pending",
      jobType: "order",
      entityId: "ord-1",
      attemptCount: 2,
    });
  });

  it("returns null when flag is on but no retryable row matches", async () => {
    mocks.isFftErpSyncEnabled.mockReturnValue(true);
    mocks.query.mockResolvedValue({ rows: [] });

    const result = await retrySyncJob("job-missing");

    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});
