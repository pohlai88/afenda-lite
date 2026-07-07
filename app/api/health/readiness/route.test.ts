import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/readiness/route";
import {
  HEALTH_NO_STORE_HEADERS,
  type HealthEnvelope,
} from "@/lib/api/health-response";
import { collectReadinessSnapshot } from "@/lib/api/readiness";

vi.mock("@/lib/api/readiness", () => ({
  collectReadinessSnapshot: vi.fn(),
}));

const mockedCollectReadinessSnapshot = vi.mocked(collectReadinessSnapshot);

describe("GET /api/health/readiness", () => {
  beforeEach(() => {
    mockedCollectReadinessSnapshot.mockReset();
  });

  it("returns the readiness snapshot in the shared health envelope", async () => {
    mockedCollectReadinessSnapshot.mockResolvedValue({
      status: "ready",
      topology: "Next.js App Router with Neon Auth and Postgres",
      storage: "Database connected",
      connection: { pooler: true, ssl: "verify-full" },
      auth: "configured",
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      HEALTH_NO_STORE_HEADERS["Cache-Control"],
    );

    const body = (await response.json()) as HealthEnvelope<{
      status: string;
      auth: string;
    }>;

    expect(body.data.status).toBe("ready");
    expect(body.data.auth).toBe("configured");
    expect(mockedCollectReadinessSnapshot).toHaveBeenCalledOnce();
  });
});
