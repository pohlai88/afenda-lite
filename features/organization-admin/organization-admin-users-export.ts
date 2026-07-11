import type { OrganizationAdminUserDisplay } from "@/features/organization-admin/organization-admin-users-map";

const EXPORT_COLUMNS = [
  "id",
  "name",
  "email",
  "username",
  "role",
  "status",
  "company",
  "country",
  "contact",
  "joinedDate",
] as const;

type ExportColumn = (typeof EXPORT_COLUMNS)[number];

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function organizationAdminUsersToCsv(
  users: OrganizationAdminUserDisplay[],
): string {
  const header = EXPORT_COLUMNS.join(",");
  const rows = users.map((user) =>
    EXPORT_COLUMNS.map((column: ExportColumn) =>
      csvEscape(String(user[column] ?? "")),
    ).join(","),
  );
  return [header, ...rows].join("\n");
}

export function organizationAdminUsersToJson(
  users: OrganizationAdminUserDisplay[],
): string {
  return `${JSON.stringify(
    users.map((user) => {
      const row: Record<string, string> = {};
      for (const column of EXPORT_COLUMNS) {
        row[column] = String(user[column] ?? "");
      }
      return row;
    }),
    null,
    2,
  )}\n`;
}

export function downloadOrganizationAdminUsersFile(input: {
  filename: string;
  content: string;
  mimeType: string;
}) {
  const blob = new Blob([input.content], { type: input.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
