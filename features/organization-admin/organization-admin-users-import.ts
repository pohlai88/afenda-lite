import {
  ORGANIZATION_ADMIN_USERS_IMPORT_MAX,
  importOrganizationUserRowSchema,
} from "@/modules/identity/schemas/users";

export const ORGANIZATION_ADMIN_USERS_IMPORT_COLUMNS = [
  "email",
  "name",
  "password",
  "role",
] as const;

export const ORGANIZATION_ADMIN_USERS_IMPORT_TEMPLATE_CSV = [
  ORGANIZATION_ADMIN_USERS_IMPORT_COLUMNS.join(","),
  "ava@example.com,Ava Rodriguez,ChangeMe123!,user",
  "admin@example.com,Org Admin,ChangeMe123!,admin",
].join("\n");

export type OrganizationAdminUserImportRow = {
  email: string;
  name: string;
  password: string;
  role: "user" | "admin";
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "");
}

function rowsFromRecords(
  records: Array<Record<string, string>>,
):
  | { users: OrganizationAdminUserImportRow[] }
  | { error: string } {
  if (records.length === 0) {
    return { error: "No user rows found in the file." };
  }
  if (records.length > ORGANIZATION_ADMIN_USERS_IMPORT_MAX) {
    return {
      error: `Import ${ORGANIZATION_ADMIN_USERS_IMPORT_MAX} users or fewer per file.`,
    };
  }

  const users: OrganizationAdminUserImportRow[] = [];
  const seenEmails = new Set<string>();

  for (let index = 0; index < records.length; index += 1) {
    const parsed = importOrganizationUserRowSchema.safeParse(records[index]);
    if (!parsed.success) {
      const detail = parsed.error.issues[0]?.message ?? "Invalid row.";
      return { error: `Row ${index + 1}: ${detail}` };
    }

    const emailKey = parsed.data.email.toLowerCase();
    if (seenEmails.has(emailKey)) {
      return {
        error: `Row ${index + 1}: duplicate email ${parsed.data.email}.`,
      };
    }
    seenEmails.add(emailKey);
    users.push(parsed.data);
  }

  return { users };
}

export function parseOrganizationAdminUsersImportCsv(text: string):
  | { users: OrganizationAdminUserImportRow[] }
  | { error: string } {
  const lines = text
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      error: "CSV needs a header row and at least one user row.",
    };
  }

  const headers = splitCsvLine(lines[0]!).map(normalizeHeader);
  const required = [...ORGANIZATION_ADMIN_USERS_IMPORT_COLUMNS];
  for (const column of required) {
    if (!headers.includes(column)) {
      return {
        error: `CSV header must include: ${required.join(", ")}.`,
      };
    }
  }

  const records = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const record: Record<string, string> = {};
    for (let index = 0; index < headers.length; index += 1) {
      const key = headers[index];
      if (key) {
        record[key] = cells[index] ?? "";
      }
    }
    return record;
  });

  return rowsFromRecords(records);
}

export function parseOrganizationAdminUsersImportJson(text: string):
  | { users: OrganizationAdminUserImportRow[] }
  | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "JSON file is not valid." };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { users?: unknown }).users)
      ? (parsed as { users: unknown[] }).users
      : null;

  if (!list) {
    return {
      error: 'JSON must be an array of users or `{ "users": [...] }`.',
    };
  }

  const records: Array<Record<string, string>> = list.map((item) => {
    if (!item || typeof item !== "object") {
      return {
        email: "",
        name: "",
        password: "",
        role: "user",
      };
    }
    const row = item as Record<string, unknown>;
    return {
      email: String(row.email ?? ""),
      name: String(row.name ?? ""),
      password: String(row.password ?? ""),
      role: String(row.role ?? "user"),
    };
  });

  return rowsFromRecords(records);
}

export function parseOrganizationAdminUsersImportFile(input: {
  filename: string;
  text: string;
}): { users: OrganizationAdminUserImportRow[] } | { error: string } {
  const lower = input.filename.toLowerCase();
  if (lower.endsWith(".json")) {
    return parseOrganizationAdminUsersImportJson(input.text);
  }
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseOrganizationAdminUsersImportCsv(input.text);
  }
  return { error: "Use a .csv or .json import file." };
}
