import { describe, expect, it } from "vitest";
import {
  HEALTH_NO_STORE_HEADERS,
  healthJson,
  type HealthEnvelope,
} from "@/lib/api/health-response";

describe("healthJson", () => {
  it("wraps payload in a typed data envelope", async () => {
    const response = healthJson({
      status: "alive",
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    const body = (await response.json()) as HealthEnvelope<{
      status: string;
      timestamp: string;
    }>;

    expect(body).toEqual({
      data: {
        status: "alive",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  it("applies shared no-store cache headers", () => {
    const response = healthJson({ status: "alive", timestamp: "now" });

    expect(response.headers.get("Cache-Control")).toBe(
      HEALTH_NO_STORE_HEADERS["Cache-Control"],
    );
  });

  it("preserves caller status and merges extra headers", () => {
    const response = healthJson(
      { status: "ready", timestamp: "now" },
      {
        status: 200,
        headers: { "X-Probe": "readiness" },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      HEALTH_NO_STORE_HEADERS["Cache-Control"],
    );
    expect(response.headers.get("X-Probe")).toBe("readiness");
  });
});
