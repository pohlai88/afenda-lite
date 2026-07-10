import * as XLSX from "xlsx";
import type {
  BulkOrderImportRow,
  CustomerPriorityImportRow,
  DepositRecordImportRow,
  HotSalesImportType,
  ImportRowPayload,
  PickupConfirmationImportRow,
  ProductSupplyImportRow,
} from "@/lib/domain/trade/import-types";

function cellString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function cellNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function rowToRecord(headers: string[], row: unknown[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i += 1) {
    const key = headers[i];
    if (!key) continue;
    record[key] = row[i];
  }
  return record;
}

export function parseImportWorkbook(
  buffer: Buffer,
  importType: HotSalesImportType,
): Array<{ rowNumber: number; payload: ImportRowPayload }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (matrix.length < 2) return [];

  const headers = (matrix[0] ?? []).map((h) => normalizeHeader(cellString(h)));
  const dataRows = matrix.slice(1).filter((row) =>
    row.some((cell) => cellString(cell).length > 0),
  );

  if (importType === "customer_priority") {
    return dataRows.map((row, index) => {
      const record = rowToRecord(headers, row);
      return {
        rowNumber: index + 2,
        payload: {
          customerName: cellString(record.customer_name ?? record.customer),
          customerCode: cellString(record.customer_code ?? record.code) || undefined,
          priorityRank: cellNumber(record.priority_rank ?? record.rank) ?? 999,
          priorityGroup:
            cellString(record.priority_group ?? record.group) || undefined,
        } satisfies CustomerPriorityImportRow,
      };
    });
  }

  if (importType === "product_supply") {
    return dataRows.map((row, index) => {
      const record = rowToRecord(headers, row);
      return {
        rowNumber: index + 2,
        payload: {
          productCode: cellString(record.product_code ?? record.code) || undefined,
          productName: cellString(record.product_name ?? record.product) || undefined,
          unit: cellString(record.unit) || undefined,
          tentativeQuantity: cellNumber(
            record.tentative_quantity ?? record.tentative,
          ),
          finalConfirmedQuantity: cellNumber(
            record.final_confirmed_quantity ??
              record.final_quantity ??
              record.quantity,
          ),
        } satisfies ProductSupplyImportRow,
      };
    });
  }

  if (importType === "bulk_order") {
    return dataRows.map((row, index) => {
      const record = rowToRecord(headers, row);
      return {
        rowNumber: index + 2,
        payload: {
          customerName: cellString(record.customer_name ?? record.customer),
          customerCode: cellString(record.customer_code ?? record.code) || undefined,
          productCode: cellString(record.product_code ?? record.code) || undefined,
          productName: cellString(record.product_name ?? record.product) || undefined,
          requestedQuantity:
            cellNumber(record.requested_quantity ?? record.quantity) ?? 0,
          remarks: cellString(record.remarks ?? record.notes) || undefined,
        } satisfies BulkOrderImportRow,
      };
    });
  }

  if (importType === "deposit_record") {
    return dataRows.map((row, index) => {
      const record = rowToRecord(headers, row);
      return {
        rowNumber: index + 2,
        payload: {
          orderNumber: cellString(record.order_number ?? record.order),
          amount: cellNumber(record.amount) ?? 0,
          reference: cellString(record.reference) || undefined,
          paidAt: cellString(record.paid_at ?? record.paid_date) || undefined,
        } satisfies DepositRecordImportRow,
      };
    });
  }

  if (importType === "pickup_confirmation") {
    return dataRows.map((row, index) => {
      const record = rowToRecord(headers, row);
      return {
        rowNumber: index + 2,
        payload: {
          orderNumber: cellString(record.order_number ?? record.order),
          fulfilledQuantity:
            cellNumber(record.fulfilled_quantity ?? record.quantity) ?? 0,
          finalSupport: cellNumber(record.final_support ?? record.support),
        } satisfies PickupConfirmationImportRow,
      };
    });
  }

  return [];
}

const TEMPLATE_SPECS: Record<
  HotSalesImportType,
  { headers: string[]; example: unknown[] }
> = {
  customer_priority: {
    headers: ["customer_name", "customer_code", "priority_rank", "priority_group"],
    example: ["Acme Corp", "ACME", 1, "P1"],
  },
  product_supply: {
    headers: [
      "product_code",
      "product_name",
      "unit",
      "tentative_quantity",
      "final_confirmed_quantity",
    ],
    example: ["SKU-001", "Widget A", "piece", 100, 80],
  },
  bulk_order: {
    headers: [
      "customer_name",
      "customer_code",
      "product_code",
      "product_name",
      "requested_quantity",
      "remarks",
    ],
    example: ["Acme Corp", "ACME", "SKU-001", "", 50, "Bulk import"],
  },
  deposit_record: {
    headers: ["order_number", "amount", "reference", "paid_at"],
    example: ["HS-00001", 5000000, "TXN-123", "2026-07-10"],
  },
  pickup_confirmation: {
    headers: ["order_number", "fulfilled_quantity", "final_support"],
    example: ["HS-00001", 50, 1200000],
  },
};

export function buildImportTemplateWorkbook(importType: HotSalesImportType): Buffer {
  const spec = TEMPLATE_SPECS[importType];
  const sheet = XLSX.utils.aoa_to_sheet([spec.headers, spec.example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "import");
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer,
  );
}
