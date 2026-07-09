import { describe, expect, it } from "vitest";
import {
  mapOperatorClientAssignmentRows,
  mapOperatorClientInvitationRows,
} from "@/lib/pages/operator-clients-page";
import {
  makeClientAssignment,
  makeClientInvitation,
} from "@/testing/unit/domain-fixtures";

describe("mapOperatorClientInvitationRows", () => {
  it("maps invitation records for the clients datatable", () => {
    const rows = mapOperatorClientInvitationRows([
      makeClientInvitation(),
    ]);

    expect(rows).toEqual([
      {
        id: "inv-1",
        token: "tok",
        fullName: "Alex Morgan",
        email: "alex@example.com",
        status: "pending",
      },
    ]);
  });
});

describe("mapOperatorClientAssignmentRows", () => {
  it("formats due dates and falls back missing survey titles", () => {
    const rows = mapOperatorClientAssignmentRows([
      makeClientAssignment({
        id: "asg-1",
        surveyId: "survey-1",
        surveyTitle: undefined,
        clientEmail: "alex@example.com",
        dueDate: new Date("2026-08-15T12:00:00.000Z"),
      }),
    ]);

    expect(rows[0]?.surveyTitle).toBe("—");
    expect(rows[0]?.dueDate).toMatch(/Aug/i);
    expect(rows[0]?.clientEmail).toBe("alex@example.com");
  });
});
