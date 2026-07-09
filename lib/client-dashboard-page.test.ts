import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientAssignment, ClientProfile } from "@/lib/clients";
import { CLIENT_PORTAL_ACK_VERSION } from "@/lib/portal-copy";

vi.mock("server-only", () => ({}));
vi.mock("@/components/client-dashboard-acknowledgement", () => ({
  ClientDashboardAcknowledgement: () => null,
}));
vi.mock("@/components/client-dashboard-assignments", () => ({
  ClientDashboardAssignments: () => null,
}));
vi.mock("@/components/client-dashboard-context", () => ({
  ClientDashboardContext: () => null,
}));
vi.mock("@/components/client-dashboard-summary", () => ({
  ClientDashboardSummary: () => null,
}));
vi.mock("@/components/portal-customer-shell", () => ({
  PortalCustomerShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/portal-trust-notice", () => ({
  PortalTrustNotice: () => null,
}));

const mockRequireClientSession = vi.fn();
const mockListClientAssignments = vi.fn();
const mockGetClientProfile = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireClientSession: (...args: unknown[]) => mockRequireClientSession(...args),
}));

vi.mock("@/lib/clients", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clients")>();
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
} from "@/lib/client-dashboard-page";

const session = {
  user: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "client@example.com",
    name: "Ada Client",
  },
};

const assignment: ClientAssignment = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  surveyId: "550e8400-e29b-41d4-a716-446655440003",
  clientEmail: "client@example.com",
  assignedBy: "ops@example.com",
  status: "pending",
  dueDate: null,
  submitBefore: null,
  confirmationCode: null,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  surveyTitle: "Annual declaration",
  surveyQuestion: "Confirm your details",
  surveySlug: "annual",
};

const profile: ClientProfile = {
  userId: session.user.id,
  fullLegalName: "Ada Client",
  nationality: "SG",
  countryOfResidence: "SG",
  additionalResidenceCountries: [],
  passportIssuingCountry: "SG",
  passportNumber: "A123",
  phone: "+65",
  entityName: "Ada Co",
  jurisdiction: "Singapore",
  notes: "",
  identityConsentAt: new Date("2026-01-01T00:00:00.000Z"),
  onboardingComplete: true,
  portalAckAt: new Date("2026-01-02T00:00:00.000Z"),
  portalAckVersion: CLIENT_PORTAL_ACK_VERSION,
};

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
