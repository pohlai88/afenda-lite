import { beforeEach, describe, expect, it, vi } from "vitest";
import { portalCopy } from "@/lib/portal-copy";

vi.mock("server-only", () => ({}));

const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn();

vi.mock("@/lib/db", () => ({
  pool: {
    connect: () => mockConnect(),
  },
}));

vi.mock("@/lib/questions", () => ({
  listQuestionsForSurvey: vi.fn(async () => [
    {
      id: "q1",
      surveyId: "s1",
      prompt: "Confirm?",
      type: "yes_no",
      required: true,
      sortOrder: 0,
      config: {},
    },
  ]),
  validateAnswers: vi.fn(() => null),
  getEvidenceRecordsByIds: vi.fn(async () => new Map()),
}));

import { submitClientDeclaration } from "@/lib/survey-submission";

describe("submitClientDeclaration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
  });

  it("returns assignment deadline error before opening a transaction", async () => {
    const result = await submitClientDeclaration({
      assignmentId: "00000000-0000-0000-0000-000000000001",
      surveyId: "00000000-0000-0000-0000-000000000002",
      clientEmail: "client@example.com",
      answers: { q1: true },
      confirmationCode: "CDP-TEST",
      dueDate: new Date("2020-01-01T00:00:00.000Z"),
      submitBefore: null,
    });

    expect(result).toEqual({
      error: portalCopy.clientDashboard.deadlineExpiredAssignment,
    });
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("returns declaration deadline error before opening a transaction", async () => {
    const result = await submitClientDeclaration({
      assignmentId: "00000000-0000-0000-0000-000000000001",
      surveyId: "00000000-0000-0000-0000-000000000002",
      clientEmail: "client@example.com",
      answers: { q1: true },
      confirmationCode: "CDP-TEST",
      dueDate: null,
      submitBefore: new Date("2020-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({
      error: portalCopy.clientDashboard.deadlineExpiredDeclaration,
    });
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("returns already submitted when assignment row is submitted", async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            status: "submitted",
            confirmation_code: "CDP-EXISTING",
          },
        ],
      })
      .mockResolvedValueOnce(undefined);

    const result = await submitClientDeclaration({
      assignmentId: "00000000-0000-0000-0000-000000000001",
      surveyId: "00000000-0000-0000-0000-000000000002",
      clientEmail: "client@example.com",
      answers: { q1: true },
      confirmationCode: "CDP-TEST",
      dueDate: null,
      submitBefore: null,
    });

    expect(result).toEqual({
      error: portalCopy.clientDashboard.alreadySubmitted,
      confirmationCode: "CDP-EXISTING",
    });
    expect(mockRelease).toHaveBeenCalled();
  });
});
