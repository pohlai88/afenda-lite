/**
 * P3 ERP process gate — F-OPS-ERP-03 / AC-OPS-01.
 * Flag assert before export.finance; flag-off skips permission and domain process.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isFftErpSyncEnabled: vi.fn(),
  requireFftPermission: vi.fn(),
  processPendingSyncJobs: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isFftErpSyncEnabled: mocks.isFftErpSyncEnabled,
  isFftDepositEnabled: vi.fn(() => false),
  isFftPickupOpsEnabled: vi.fn(() => false),
}));

vi.mock("@/modules/fft/auth/fft-session", () => ({
  requireFftPermission: mocks.requireFftPermission,
  requireFftAdmin: vi.fn(),
}));

vi.mock("@/modules/platform/db", () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
}));

vi.mock("@/modules/fft/domain/erp-sync-store", () => ({
  enqueueErpSyncJob: vi.fn(),
  getSyncJobById: vi.fn(),
  retrySyncJob: vi.fn(),
  processPendingSyncJobs: mocks.processPendingSyncJobs,
  listSyncJobs: vi.fn(),
  listSyncJobsWithDetails: vi.fn(),
  buildSyncIdempotencyKey: vi.fn(),
}));

import { processErpSyncJobsAction } from "@/app/actions/fft";

describe("processErpSyncJobsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFftPermission.mockResolvedValue({
      userId: "user-1",
      isAdmin: false,
    });
    mocks.processPendingSyncJobs.mockResolvedValue({
      processed: 2,
      succeeded: 1,
    });
  });

  it("returns erp_sync_disabled and skips permission + process when flag is off", async () => {
    mocks.isFftErpSyncEnabled.mockReturnValue(false);

    const result = await processErpSyncJobsAction("en");

    expect(result).toEqual({ error: "erp_sync_disabled" });
    expect(mocks.requireFftPermission).not.toHaveBeenCalled();
    expect(mocks.processPendingSyncJobs).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("processes pending jobs when flag is on and export.finance is granted", async () => {
    mocks.isFftErpSyncEnabled.mockReturnValue(true);

    const result = await processErpSyncJobsAction("en");

    expect(result).toEqual({ ok: true, processed: 2, succeeded: 1 });
    expect(mocks.requireFftPermission).toHaveBeenCalledWith("export.finance");
    expect(mocks.processPendingSyncJobs).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/fft/admin/erp-sync");
  });
});
