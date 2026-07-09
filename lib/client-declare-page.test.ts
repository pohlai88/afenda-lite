import { describe, expect, it } from "vitest";
import type { ClientAssignment, ClientProfile } from "@/lib/clients";
import {
  resolveClientDeclarePageGate,
  resolveClientDeclareWorkspaceProps,
} from "@/lib/client-declare-page.logic";
import { CLIENT_PORTAL_ACK_VERSION } from "@/lib/portal-copy";

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

const acknowledgedProfile: ClientProfile = {
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
};

describe("resolveClientDeclarePageGate", () => {
  it("returns not-found when assignment is missing or lacks slug", () => {
    expect(resolveClientDeclarePageGate(null, acknowledgedProfile)).toBe(
      "not-found",
    );
    expect(
      resolveClientDeclarePageGate(
        { ...baseAssignment, surveySlug: null },
        acknowledgedProfile,
      ),
    ).toBe("not-found");
  });

  it("redirects home when acknowledgement is required and missing", () => {
    expect(resolveClientDeclarePageGate(baseAssignment, null)).toBe(
      "redirect-home",
    );
    expect(
      resolveClientDeclarePageGate(baseAssignment, {
        ...acknowledgedProfile,
        portalAckAt: null,
      }),
    ).toBe("redirect-home");
  });

  it("continues for submitted assignments without acknowledgement", () => {
    expect(
      resolveClientDeclarePageGate(
        {
          ...baseAssignment,
          status: "submitted",
          confirmationCode: "CDP-123",
        },
        null,
      ),
    ).toBe("continue");
  });

  it("continues when acknowledgement is present", () => {
    expect(
      resolveClientDeclarePageGate(baseAssignment, acknowledgedProfile),
    ).toBe("continue");
  });
});

describe("resolveClientDeclareWorkspaceProps", () => {
  const scopedAssignment = {
    ...baseAssignment,
    surveySlug: "annual",
  } as ClientAssignment & { surveySlug: string };

  it("returns receipt props for submitted assignments", () => {
    expect(
      resolveClientDeclareWorkspaceProps({
        assignment: {
          ...scopedAssignment,
          status: "submitted",
          confirmationCode: "CDP-123",
        },
        questions: [{ id: "q1", type: "boolean", label: "Confirm" }],
        declarationEyebrow: "Declaration",
      }),
    ).toEqual({
      kind: "receipt",
      title: "Annual declaration",
      confirmationCode: "CDP-123",
    });
  });

  it("returns empty-questions when the survey has no questions", () => {
    expect(
      resolveClientDeclareWorkspaceProps({
        assignment: scopedAssignment,
        questions: [],
        declarationEyebrow: "Declaration",
      }),
    ).toEqual({
      kind: "empty-questions",
      title: "Annual declaration",
    });
  });

  it("returns expired when the deadline has passed", () => {
    const expired = resolveClientDeclareWorkspaceProps({
      assignment: {
        ...scopedAssignment,
        submitBefore: new Date("2020-01-01T00:00:00.000Z"),
      },
      questions: [{ id: "q1", type: "boolean", label: "Confirm" }],
      declarationEyebrow: "Declaration",
    });

    expect(expired.kind).toBe("expired");
    if (expired.kind === "expired") {
      expect(expired.title).toBe("Annual declaration");
      expect(expired.deadline.submitBefore).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
    }
  });

  it("returns form props with draft state when active", () => {
    const form = resolveClientDeclareWorkspaceProps({
      assignment: {
        ...scopedAssignment,
        draftAnswers: { q1: true },
        draftStepIndex: 2,
        draftSavedAt: new Date("2026-07-08T12:00:00.000Z"),
      },
      questions: [{ id: "q1", type: "boolean", label: "Confirm" }],
      declarationEyebrow: "Declaration",
      initialEvidenceNames: { q1: "passport.pdf" },
    });

    expect(form).toEqual({
      kind: "form",
      title: "Annual declaration",
      description: "Confirm your details",
      deadline: {
        status: "pending",
        dueDate: null,
        submitBefore: null,
      },
      form: {
        assignmentId: scopedAssignment.id,
        surveyId: scopedAssignment.surveyId,
        slug: "annual",
        questions: [{ id: "q1", type: "boolean", label: "Confirm" }],
        initialAnswers: { q1: true },
        initialStepIndex: 2,
        initialEvidenceNames: { q1: "passport.pdf" },
        initialDraftSavedAt: new Date("2026-07-08T12:00:00.000Z"),
      },
    });
  });
});
