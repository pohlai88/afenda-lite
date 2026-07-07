import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/liveness/route";
import {
  HEALTH_NO_STORE_HEADERS,
  type HealthEnvelope,
} from "@/lib/api/health-response";

describe("GET /api/health/liveness", () => {
  it("returns an alive envelope with no-store cache headers", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      HEALTH_NO_STORE_HEADERS["Cache-Control"],
    );

    const body = (await response.json()) as HealthEnvelope<{
      status: string;
      timestamp: string;
    }>;

    expect(body.data.status).toBe("alive");
    expect(body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
