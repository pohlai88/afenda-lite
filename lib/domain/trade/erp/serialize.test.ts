import { describe, expect, it } from "vitest";
import {
  toHotSalesSyncJobDetailDto,
  type HotSalesSyncJobDetail,
} from "@/lib/domain/trade/erp/types";

describe("toHotSalesSyncJobDetailDto", () => {
  it("serializes Date fields to ISO-8601 strings", () => {
    const job: HotSalesSyncJobDetail = {
      id: "job-1",
      jobType: "order",
      entityId: "ord-1",
      idempotencyKey: "sync:order:ord-1:v1",
      status: "failed",
      attemptCount: 1,
      scheduledAt: new Date("2026-07-10T08:00:00.000Z"),
      lastError: "network_error",
      createdAt: new Date("2026-07-10T07:00:00.000Z"),
      updatedAt: new Date("2026-07-10T08:00:00.000Z"),
      attempts: [
        {
          id: "att-1",
          jobId: "job-1",
          attemptNo: 1,
          status: "failed",
          startedAt: new Date("2026-07-10T07:30:00.000Z"),
          finishedAt: new Date("2026-07-10T07:31:00.000Z"),
          errors: [
            {
              id: "err-1",
              attemptId: "att-1",
              code: "network_error",
              message: "timeout",
              retryable: true,
              createdAt: new Date("2026-07-10T07:31:00.000Z"),
            },
          ],
        },
      ],
    };

    const dto = toHotSalesSyncJobDetailDto(job);
    expect(dto.scheduledAt).toBe("2026-07-10T08:00:00.000Z");
    expect(dto.attempts[0]?.startedAt).toBe("2026-07-10T07:30:00.000Z");
    expect(dto.attempts[0]?.finishedAt).toBe("2026-07-10T07:31:00.000Z");
    expect(dto.attempts[0]?.errors[0]?.createdAt).toBe(
      "2026-07-10T07:31:00.000Z",
    );
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });
});
