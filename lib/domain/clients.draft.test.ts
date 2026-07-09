import { describe, expect, it } from "vitest";
import { assignmentHasDraftProgress, type ClientAssignment } from "@/lib/domain/clients";

const baseAssignment: ClientAssignment = {
  id: "a1",
  surveyId: "s1",
  clientEmail: "client@example.com",
  assignedBy: "op1",
  status: "pending",
  dueDate: null,
  submitBefore: null,
  createdAt: new Date("2026-07-01T12:00:00Z"),
};

describe("assignmentHasDraftProgress", () => {
  it("returns false when no draft answers exist", () => {
    expect(assignmentHasDraftProgress(baseAssignment)).toBe(false);
  });

  it("returns true when pending assignment has draft answers", () => {
    expect(
      assignmentHasDraftProgress({
        ...baseAssignment,
        draftAnswers: { "q1": true },
        draftStepIndex: 2,
      }),
    ).toBe(true);
  });

  it("returns false when assignment is submitted", () => {
    expect(
      assignmentHasDraftProgress({
        ...baseAssignment,
        status: "submitted",
        draftAnswers: { "q1": true },
      }),
    ).toBe(false);
  });
});
