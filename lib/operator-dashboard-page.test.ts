import { describe, expect, it } from "vitest";
import { mapOperatorDeclarationRows } from "@/lib/operator-dashboard-page";

describe("mapOperatorDeclarationRows", () => {
  it("maps admin survey records for the declarations datatable", () => {
    const rows = mapOperatorDeclarationRows([
      {
        id: "survey-1",
        title: "Annual declaration",
        question: "Confirm your details",
        slug: "annual",
        caseNumber: "CASE-1",
        referenceNumber: null,
        dueDate: null,
        submitBefore: null,
        responseCount: 3,
        createdAt: new Date("2026-07-01"),
        updatedAt: new Date("2026-07-02"),
      },
    ]);

    expect(rows).toEqual([
      {
        id: "survey-1",
        title: "Annual declaration",
        description: "Confirm your details",
        caseNumber: "CASE-1",
        responseCount: 3,
      },
    ]);
  });
});
