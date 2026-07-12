import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  list: vi.fn(),
  setActive: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/modules/identity/auth/server", () => ({
  auth: {
    getSession: mocks.getSession,
    organization: {
      list: mocks.list,
      setActive: mocks.setActive,
      create: mocks.create,
    },
  },
}));

vi.mock("@/modules/platform/env/server", () => ({
  getServerEnv: () => ({
    PORTAL_ORG_SLUG: "iam-check",
    PORTAL_ORG_NAME: "iam-check",
    APP_URL: "https://afenda-lite.vercel.app",
  }),
}));

import {
  ensurePortalOrganization,
  NoActiveOrganizationError,
  setActivePortalOrganization,
} from "@/modules/identity/portal-organization";

describe("ensurePortalOrganization N1 active org", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setActive.mockResolvedValue({});
  });

  it("prefers session.activeOrganizationId when it is in the member list", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { activeOrganizationId: "org-active" },
        user: { id: "u1" },
      },
    });
    mocks.list.mockResolvedValue({
      data: [
        { id: "org-other", name: "Other", slug: "other" },
        { id: "org-active", name: "Active", slug: "iam-check" },
      ],
      error: null,
    });

    const org = await ensurePortalOrganization();
    expect(org.id).toBe("org-active");
    expect(mocks.setActive).not.toHaveBeenCalled();
  });

  it("falls back to portal slug and setActive when session has no active org", async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.list.mockResolvedValue({
      data: [
        { id: "org-slug", name: "Portal", slug: "iam-check" },
        { id: "org-other", name: "Other", slug: "other" },
      ],
      error: null,
    });

    const org = await ensurePortalOrganization();
    expect(org.id).toBe("org-slug");
    expect(mocks.setActive).toHaveBeenCalledWith({
      organizationId: "org-slug",
    });
  });

  it("uses sole membership when no active and no slug match", async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.list.mockResolvedValue({
      data: [{ id: "org-only", name: "Only", slug: "solo" }],
      error: null,
    });

    const org = await ensurePortalOrganization();
    expect(org.id).toBe("org-only");
    expect(mocks.setActive).toHaveBeenCalledWith({
      organizationId: "org-only",
    });
  });

  it("fails closed when multiple orgs and no active / slug match (M1)", async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.list.mockResolvedValue({
      data: [
        { id: "org-a", name: "A", slug: "a" },
        { id: "org-b", name: "B", slug: "b" },
      ],
      error: null,
    });

    await expect(ensurePortalOrganization()).rejects.toBeInstanceOf(
      NoActiveOrganizationError,
    );
    expect(mocks.setActive).not.toHaveBeenCalled();
  });
});

describe("setActivePortalOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setActive.mockResolvedValue({});
  });

  it("rejects organization outside membership", async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.list.mockResolvedValue({
      data: [{ id: "org-a", name: "A", slug: "a" }],
      error: null,
    });

    const result = await setActivePortalOrganization("org-foreign");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("setActive when organization is in membership", async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.list.mockResolvedValue({
      data: [
        { id: "org-a", name: "A", slug: "a" },
        { id: "org-b", name: "B", slug: "b" },
      ],
      error: null,
    });

    const result = await setActivePortalOrganization("org-b");
    expect(result.ok).toBe(true);
    expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: "org-b" });
  });
});
