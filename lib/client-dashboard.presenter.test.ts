import { describe, expect, it } from "vitest";
import type { ClientAssignment, ClientProfile } from "@/lib/domain/clients";
import {
  assignmentCardStatus,
  buildAssignmentCardView,
  buildClientDashboardView,
  buildDeclarantSummaryView,
} from "@/lib/client-dashboard.presenter";
import { CLIENT_PORTAL_ACK_VERSION } from "@/lib/copy/portal-copy";

const baseAssignment: ClientAssignment = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  surveyId: "550e8400-e29b-41d4-a716-446655440002",
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

const baseProfile: ClientProfile = {
  userId: "550e8400-e29b-41d4-a716-446655440003",
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
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("client-dashboard.presenter", () => {
  it("maps profile into a narrow declarant summary", () => {
    expect(buildDeclarantSummaryView(baseProfile)).toEqual({
      fullLegalName: "Ada Client",
      entityName: "Ada Co",
      jurisdiction: "Singapore",
    });
    expect(buildDeclarantSummaryView(null)).toBeNull();
  });

  it("classifies assignment card status from draft progress", () => {
    expect(assignmentCardStatus(baseAssignment)).toBe("pending");
    expect(
      assignmentCardStatus({
        ...baseAssignment,
        draftAnswers: { "550e8400-e29b-41d4-a716-446655440099": true },
        draftStepIndex: 1,
      }),
    ).toBe("inProgress");
    expect(
      assignmentCardStatus({
        ...baseAssignment,
        status: "submitted",
        confirmationCode: "CDP-1",
      }),
    ).toBe("submitted");
  });

  it("builds assignment cards with href and display fields only", () => {
    const card = buildAssignmentCardView(baseAssignment);
    expect(card).toMatchObject({
      id: baseAssignment.id,
      title: "Annual declaration",
      question: "Confirm your details",
      href: `/client/declare/${baseAssignment.id}`,
      status: "pending",
      confirmationCode: null,
    });
  });

  it("assembles a dashboard view with gate and metrics", () => {
    const view = buildClientDashboardView({
      assignments: [
        baseAssignment,
        {
          ...baseAssignment,
          id: "550e8400-e29b-41d4-a716-446655440010",
          status: "submitted",
          confirmationCode: "CDP-DONE",
        },
      ],
      profile: baseProfile,
    });

    expect(view.actionsEnabled).toBe(true);
    expect(view.acknowledgement).toEqual({
      kind: "acknowledged",
      acknowledgedOn: expect.any(String),
    });
    expect(view.metrics.submitted).toBe(1);
    expect(view.metrics.pending).toBe(1);
    expect(view.assignments).toHaveLength(2);
    expect(view.declarant?.fullLegalName).toBe("Ada Client");
  });

  it("keeps actions disabled until portal acknowledgement", () => {
    const view = buildClientDashboardView({
      assignments: [baseAssignment],
      profile: { ...baseProfile, portalAckAt: null, portalAckVersion: null },
    });

    expect(view.actionsEnabled).toBe(false);
    expect(view.acknowledgement).toEqual({ kind: "pending" });
  });
});
