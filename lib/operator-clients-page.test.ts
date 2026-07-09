import { describe, expect, it } from "vitest";
import {
  mapOperatorClientAssignmentRows,
  mapOperatorClientInvitationRows,
} from "@/lib/operator-clients-page";

describe("mapOperatorClientInvitationRows", () => {
  it("maps invitation records for the clients datatable", () => {
    const rows = mapOperatorClientInvitationRows([
      {
        id: "inv-1",
        token: "tok",
        fullName: "Alex Morgan",
        email: "alex@example.com",
        status: "pending",
        invitedBy: "admin",
        surveyId: "survey-1",
        expiresAt: new Date("2026-08-01"),
        createdAt: new Date("2026-07-01"),
        acceptedAt: null,
      },
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
      {
        id: "asg-1",
        surveyId: "survey-1",
        surveyTitle: null,
        clientEmail: "alex@example.com",
        status: "pending",
        dueDate: new Date("2026-08-15T12:00:00.000Z"),
        confirmationCode: null,
        createdAt: new Date("2026-07-01"),
        submittedAt: null,
      },
    ]);

    expect(rows[0]?.surveyTitle).toBe("—");
    expect(rows[0]?.dueDate).toMatch(/Aug/i);
    expect(rows[0]?.clientEmail).toBe("alex@example.com");
  });
});
