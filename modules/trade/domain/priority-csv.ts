import {
  validateCustomerPriorityRows,
  type ValidatedImportRow,
} from "@/modules/trade/domain/import-validators";
import type { CustomerPriorityImportRow } from "@/modules/trade/domain/import-types";

/** Parse setup-page priority CSV (header + rows). Returns validated rows or a single error code. */
export function parseAndValidatePriorityCsv(csvText: string):
  | { ok: true; rows: CustomerPriorityImportRow[] }
  | { ok: false; error: string } {
  const trimmed = csvText.trim();
  if (!trimmed) {
    return { ok: false, error: "priority_csv_empty" };
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 2) {
    return { ok: false, error: "priority_csv_no_rows" };
  }

  const dataLines = lines.slice(1);
  const staged = dataLines
    .map((line, index) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.every((c) => !c)) return null;
      return {
        rowNumber: index + 2,
        payload: {
          customerName: cols[0] ?? "",
          customerCode: cols[1] || undefined,
          priorityRank: Number(cols[2] ?? 999),
          priorityGroup: cols[3] || undefined,
        } satisfies CustomerPriorityImportRow,
      };
    })
    .filter((row): row is { rowNumber: number; payload: CustomerPriorityImportRow } =>
      row != null,
    );

  if (staged.length === 0) {
    return { ok: false, error: "priority_csv_no_rows" };
  }

  const validated: ValidatedImportRow<CustomerPriorityImportRow>[] =
    validateCustomerPriorityRows(staged);
  const firstBad = validated.find((row) => row.validationErrors.length > 0);
  if (firstBad) {
    return {
      ok: false,
      error: firstBad.validationErrors[0] ?? "priority_csv_invalid",
    };
  }

  return {
    ok: true,
    rows: validated.map((row) => row.payload),
  };
}
