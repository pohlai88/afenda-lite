import { beforeEach, describe, expect, it, vi } from "vitest";
import { portalCopy } from "@/lib/copy/portal-copy";

vi.mock("server-only", () => ({}));

const mockGetClientAssignmentForUser = vi.fn();
const mockGetClientProfile = vi.fn();
const mockIsClientPortalAcknowledged = vi.fn();
const mockSaveClientAssignmentDraft = vi.fn();

vi.mock("@/lib/domain/clients", () => ({
  getClientAssignmentForUser: (...args: unknown[]) =>
    mockGetClientAssignmentForUser(...args),
  getClientProfile: (...args: unknown[]) => mockGetClientProfile(...args),
  isClientPortalAcknowledged: (...args: unknown[]) =>
    mockIsClientPortalAcknowledged(...args),
  saveClientAssignmentDraft: (...args: unknown[]) =>
    mockSaveClientAssignmentDraft(...args),
}));

import { persistClientDeclarationDraft } from "@/lib/domain/client-declaration-draft";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const userId = "550e8400-e29b-41d4-a716-446655440002";
const userEmail = "client@example.com";
const questionId = "550e8400-e29b-41d4-a716-446655440003";
const baseInput = {
  assignmentId,
  userId,
  userEmail,
  answers: { [questionId]: true },
  stepIndex: 0,
};

function pendingAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: assignmentId,
    surveyId: "550e8400-e29b-41d4-a716-446655440004",
    clientEmail: userEmail,
    assignedBy: "operator@example.com",
    status: "pending" as const,
    dueDate: null,
    submitBefore: null,
    confirmationCode: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("persistClientDeclarationDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientProfile.mockResolvedValue({ portalAckAt: new Date() });
    mockIsClientPortalAcknowledged.mockReturnValue(true);
    mockSaveClientAssignmentDraft.mockResolvedValue(
      new Date("2026-07-08T12:00:00.000Z"),
    );
  });

  it("returns 404 when assignment is missing or submitted", async () => {
    mockGetClientAssignmentForUser.mockResolvedValue(null);

    const result = await persistClientDeclarationDraft(baseInput);

    expect(result).toEqual({
      success: false,
      error: portalCopy.clientDashboard.assignmentNotFound,
      status: 404,
    });
    expect(mockSaveClientAssignmentDraft).not.toHaveBeenCalled();
  });

  it("returns assignment deadline error before saving", async () => {
    mockGetClientAssignmentForUser.mockResolvedValue(
      pendingAssignment({
        dueDate: new Date("2020-01-01T00:00:00.000Z"),
      }),
    );

    const result = await persistClientDeclarationDraft(baseInput);

    expect(result).toEqual({
      success: false,
      error: portalCopy.clientDashboard.deadlineExpiredAssignment,
      status: 403,
    });
    expect(mockSaveClientAssignmentDraft).not.toHaveBeenCalled();
  });

  it("returns declaration deadline error before saving", async () => {
    mockGetClientAssignmentForUser.mockResolvedValue(
      pendingAssignment({
        submitBefore: new Date("2020-01-01T00:00:00.000Z"),
      }),
    );

    const result = await persistClientDeclarationDraft(baseInput);

    expect(result).toEqual({
      success: false,
      error: portalCopy.clientDashboard.deadlineExpiredDeclaration,
      status: 403,
    });
    expect(mockSaveClientAssignmentDraft).not.toHaveBeenCalled();
  });

  it("returns acknowledgement gate error when portal is not acknowledged", async () => {
    mockGetClientAssignmentForUser.mockResolvedValue(pendingAssignment());
    mockIsClientPortalAcknowledged.mockReturnValue(false);

    const result = await persistClientDeclarationDraft(baseInput);

    expect(result).toEqual({
      success: false,
      error: portalCopy.clientDashboard.acknowledgement.gateNotice,
      status: 403,
    });
    expect(mockSaveClientAssignmentDraft).not.toHaveBeenCalled();
  });

  it("persists draft and returns savedAt on success", async () => {
    mockGetClientAssignmentForUser.mockResolvedValue(pendingAssignment());

    const result = await persistClientDeclarationDraft(baseInput);

    expect(result).toEqual({
      success: true,
      savedAt: "2026-07-08T12:00:00.000Z",
    });
    expect(mockSaveClientAssignmentDraft).toHaveBeenCalledWith({
      assignmentId,
      clientEmail: userEmail,
      answers: baseInput.answers,
      stepIndex: 0,
    });
  });

  it("returns draftSaveError when the database update does not persist", async () => {
    mockGetClientAssignmentForUser.mockResolvedValue(pendingAssignment());
    mockSaveClientAssignmentDraft.mockResolvedValue(null);

    const result = await persistClientDeclarationDraft(baseInput);

    expect(result).toEqual({
      success: false,
      error: portalCopy.declarationForm.wizard.draftSaveError,
      status: 500,
    });
  });
});
