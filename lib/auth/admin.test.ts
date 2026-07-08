import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  getAuthSession: mocks.getAuthSession,
}));

vi.mock("@/lib/admin", () => ({
  isAdminSession: mocks.isAdminSession,
}));

vi.mock("@/lib/auth/server", () => ({
  auth: {
    admin: {
      createUser: mocks.createUser,
    },
  },
}));

import { assertNeonAdminSession, neonAdminCreateUser } from "@/lib/auth/admin";

describe("assertNeonAdminSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an error when the caller is not an admin", async () => {
    mocks.getAuthSession.mockResolvedValue({ user: { email: "client@example.com" } });
    mocks.isAdminSession.mockReturnValue(false);

    await expect(assertNeonAdminSession()).resolves.toEqual({
      error: "Admin session required.",
    });
  });

  it("returns null when the caller is an admin", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { email: "admin@example.com", role: "admin" },
    });
    mocks.isAdminSession.mockReturnValue(true);

    await expect(assertNeonAdminSession()).resolves.toBeNull();
  });
});

describe("neonAdminCreateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an admin session before calling Neon Admin APIs", async () => {
    mocks.getAuthSession.mockResolvedValue(null);
    mocks.isAdminSession.mockReturnValue(false);

    await expect(
      neonAdminCreateUser({
        email: "client@example.com",
        password: "secret-password",
        name: "Client User",
      }),
    ).resolves.toEqual({ error: "Admin session required." });

    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("returns the created user when Neon Admin succeeds", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { email: "admin@example.com", role: "admin" },
    });
    mocks.isAdminSession.mockReturnValue(true);
    mocks.createUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "client@example.com", role: "user" } },
      error: null,
    });

    await expect(
      neonAdminCreateUser({
        email: "client@example.com",
        password: "secret-password",
        name: "Client User",
      }),
    ).resolves.toEqual({
      user: { id: "user-1", email: "client@example.com", role: "user" },
    });
  });
});
