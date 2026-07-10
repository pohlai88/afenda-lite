import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { portalCopy } from "@/lib/copy/portal-copy";
import type { ClientAssignment } from "@/lib/domain/clients";
import {
  clientDeclarePageMetadata,
  runClientDeclarePage,
} from "@/lib/pages/client-declare-page";
import {
  resolveClientDeclarePageGate,
  resolveClientDeclareWorkspaceProps,
} from "@/lib/pages/client-declare-page.logic";
import {
  makeClientAssignment,
  makeClientProfile,
  makeYesNoQuestion,
} from "@/testing/unit/domain-fixtures";

describe("clientDeclarePageMetadata", () => {
  it("exports unavailable stub metadata from portal copy", () => {
    expect(clientDeclarePageMetadata.title).toContain(
      portalCopy.clientWorkspace.unavailableTitle,
    );
    expect(clientDeclarePageMetadata.description).toBe(
      portalCopy.clientWorkspace.unavailableDescription,
    );
  });
});

describe("runClientDeclarePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the shared unavailable panel without exercising gates", async () => {
    const ui = await runClientDeclarePage();
    expect(ui.props.copy.title).toBe(
      portalCopy.clientWorkspace.unavailableTitle,
    );
  });
});


const baseAssignment = makeClientAssignment();
const acknowledgedProfile = makeClientProfile();
const confirmQuestion = makeYesNoQuestion();

describe("resolveClientDeclarePageGate", () => {
  it("returns not-found when assignment is missing or lacks slug", () => {
    expect(resolveClientDeclarePageGate(null, acknowledgedProfile)).toBe(
      "not-found",
    );
    expect(
      resolveClientDeclarePageGate(
        makeClientAssignment({ surveySlug: undefined }),
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
        makeClientAssignment({
          status: "submitted",
          confirmationCode: "CDP-123",
        }),
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
  const scopedAssignment = baseAssignment as ClientAssignment & {
    surveySlug: string;
  };

  it("returns receipt props for submitted assignments", () => {
    expect(
      resolveClientDeclareWorkspaceProps({
        assignment: makeClientAssignment({
          surveySlug: "annual",
          status: "submitted",
          confirmationCode: "CDP-123",
        }) as ClientAssignment & { surveySlug: string },
        questions: [confirmQuestion],
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
      questions: [confirmQuestion],
      declarationEyebrow: "Declaration",
    });

    expect(expired.kind).toBe("expired");
    if (expired.kind === "expired") {
      expect(expired.title).toBe("Annual declaration");
      expect(expired.deadline.submitBefore).toBe("2020-01-01T00:00:00.000Z");
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
      questions: [confirmQuestion],
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
        questions: [confirmQuestion],
        initialAnswers: { q1: true },
        initialStepIndex: 2,
        initialEvidenceNames: { q1: "passport.pdf" },
        initialDraftSavedAt: "2026-07-08T12:00:00.000Z",
      },
    });
  });
});
