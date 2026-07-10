import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeClientAssignment,
  makeClientProfile,
} from "@/testing/unit/domain-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/components/client/client-dashboard-acknowledgement", () => ({
  ClientDashboardAcknowledgement: () => null,
}));
vi.mock("@/components/client/client-dashboard-assignments", () => ({
  ClientDashboardAssignments: () => null,
}));
vi.mock("@/components/client/client-dashboard-context", () => ({
  ClientDashboardContext: () => null,
}));
vi.mock("@/components/client/client-dashboard-summary", () => ({
  ClientDashboardSummary: () => null,
}));
vi.mock("@/components/portal/portal-application-shell", () => ({
  PortalWorkspacePage: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/portal/portal-trust-notice", () => ({
  PortalTrustNotice: () => null,
}));

const mockRequireClientSession = vi.fn();
const mockListClientAssignments = vi.fn();
const mockGetClientProfile = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireClientSession: (...args: unknown[]) => mockRequireClientSession(...args),
}));

vi.mock("@/lib/domain/clients", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domain/clients")>();
  return {
    ...actual,
    listClientAssignments: (...args: unknown[]) =>
      mockListClientAssignments(...args),
    getClientProfile: (...args: unknown[]) => mockGetClientProfile(...args),
  };
});

import {
  clientDashboardPageMetadata,
  runClientDashboardPage,
} from "@/lib/pages/client-dashboard-page";

const session = {
  user: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "client@example.com",
    name: "Ada Client",
  },
};

const assignment = makeClientAssignment({
  id: "550e8400-e29b-41d4-a716-446655440002",
  surveyId: "550e8400-e29b-41d4-a716-446655440003",
});

const profile = makeClientProfile({ userId: session.user.id });

describe("clientDashboardPageMetadata", () => {
  it("exports client dashboard metadata", () => {
    expect(clientDashboardPageMetadata.title).toMatch(/client/i);
    expect(clientDashboardPageMetadata.description).toBeTruthy();
  });
});

describe("runClientDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireClientSession.mockResolvedValue(session);
    mockListClientAssignments.mockResolvedValue([assignment]);
    mockGetClientProfile.mockResolvedValue(profile);
  });

  it("requires an onboarded client session before loading data", async () => {
    await runClientDashboardPage();

    expect(mockRequireClientSession).toHaveBeenCalledWith({
      requireOnboarding: true,
    });
  });

  it("loads assignments and profile for the signed-in client", async () => {
    await runClientDashboardPage();

    expect(mockListClientAssignments).toHaveBeenCalledWith(session.user.email);
    expect(mockGetClientProfile).toHaveBeenCalledWith(session.user.id);
  });
});
