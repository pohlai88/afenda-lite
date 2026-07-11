import { describe, expect, it } from "vitest";
import { mapOperatorDeclarationRows } from "@/features/organization-admin/organization-admin-dashboard-page";
import { makeSurveyWithStats } from "@/testing/unit/domain-fixtures";

describe("mapOperatorDeclarationRows", () => {
  it("maps admin survey records for the declarations datatable", () => {
    const rows = mapOperatorDeclarationRows([makeSurveyWithStats()]);

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
