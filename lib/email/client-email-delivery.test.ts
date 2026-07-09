import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@/lib/env/server", () => ({
  getServerEnv: vi.fn(),
}));

import { getServerEnv } from "@/lib/env/server";
import {
  getClientEmailDeliveryStatus,
  isClientEmailDeliveryEnabled,
  NEON_AUTH_SHARED_SENDER_EMAIL,
} from "@/lib/email/client-email-delivery";

const mockedGetServerEnv = vi.mocked(getServerEnv);

afterEach(() => {
  vi.clearAllMocks();
});

describe("client email delivery (operator register)", () => {
  it("is enabled when NEON_AUTH_BASE_URL is set", () => {
    mockedGetServerEnv.mockReturnValue({
      NEON_AUTH_BASE_URL: "https://example.neonauth.test/auth",
    } as ReturnType<typeof getServerEnv>);

    expect(isClientEmailDeliveryEnabled()).toBe(true);
    expect(getClientEmailDeliveryStatus()).toEqual({
      enabled: true,
      provider: "neon-auth-organization",
      fromName: "Client Declaration Portal",
      fromEmail: NEON_AUTH_SHARED_SENDER_EMAIL,
    });
  });

  it("is disabled when Neon Auth is not configured", () => {
    mockedGetServerEnv.mockReturnValue({} as ReturnType<typeof getServerEnv>);

    expect(isClientEmailDeliveryEnabled()).toBe(false);
    expect(getClientEmailDeliveryStatus()).toEqual({ enabled: false });
  });
});
