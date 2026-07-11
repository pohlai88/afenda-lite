import { describe, expect, it } from "vitest";
import { parseAndValidatePriorityCsv } from "@/modules/trade/domain/priority-csv";

describe("parseAndValidatePriorityCsv (AC-PRI-01 / G1)", () => {
  it("accepts a valid CSV body", () => {
    const result = parseAndValidatePriorityCsv(
      "customer_name,customer_code,priority_rank,priority_group\nAlpha,C1,1,P1\nBeta,C2,2,P1\n",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      {
        customerName: "Alpha",
        customerCode: "C1",
        priorityRank: 1,
        priorityGroup: "P1",
      },
      {
        customerName: "Beta",
        customerCode: "C2",
        priorityRank: 2,
        priorityGroup: "P1",
      },
    ]);
  });

  it("rejects empty csv", () => {
    expect(parseAndValidatePriorityCsv("").ok).toBe(false);
    expect(parseAndValidatePriorityCsv("   ")).toEqual({
      ok: false,
      error: "priority_csv_empty",
    });
  });

  it("rejects header-only csv", () => {
    expect(
      parseAndValidatePriorityCsv(
        "customer_name,customer_code,priority_rank,priority_group\n",
      ),
    ).toEqual({ ok: false, error: "priority_csv_no_rows" });
  });

  it("rejects invalid rank", () => {
    const result = parseAndValidatePriorityCsv(
      "customer_name,customer_code,priority_rank,priority_group\nAlpha,C1,0,P1\n",
    );
    expect(result).toEqual({ ok: false, error: "priority_rank_invalid" });
  });

  it("rejects missing customer name", () => {
    const result = parseAndValidatePriorityCsv(
      "customer_name,customer_code,priority_rank,priority_group\n,C1,1,P1\n",
    );
    expect(result).toEqual({ ok: false, error: "customer_name_required" });
  });
});
