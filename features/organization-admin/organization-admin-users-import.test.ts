import { describe, expect, it } from "vitest";
import {
  ORGANIZATION_ADMIN_USERS_IMPORT_TEMPLATE_CSV,
  parseOrganizationAdminUsersImportCsv,
  parseOrganizationAdminUsersImportFile,
  parseOrganizationAdminUsersImportJson,
} from "@/features/organization-admin/organization-admin-users-import";

describe("parseOrganizationAdminUsersImportCsv", () => {
  it("parses the template", () => {
    const parsed = parseOrganizationAdminUsersImportCsv(
      ORGANIZATION_ADMIN_USERS_IMPORT_TEMPLATE_CSV,
    );
    expect("users" in parsed).toBe(true);
    if ("users" in parsed) {
      expect(parsed.users).toHaveLength(2);
      expect(parsed.users[0]).toMatchObject({
        email: "ava@example.com",
        role: "user",
      });
      expect(parsed.users[1]?.role).toBe("admin");
    }
  });

  it("maps Guest role to user", () => {
    const parsed = parseOrganizationAdminUsersImportCsv(
      "email,name,password,role\nguest@example.com,Guest User,ChangeMe123!,Guest\n",
    );
    expect("users" in parsed).toBe(true);
    if ("users" in parsed) {
      expect(parsed.users[0]?.role).toBe("user");
    }
  });

  it("rejects duplicate emails", () => {
    const parsed = parseOrganizationAdminUsersImportCsv(
      [
        "email,name,password,role",
        "ava@example.com,Ava,ChangeMe123!,user",
        "AVA@example.com,Ava Two,ChangeMe123!,user",
      ].join("\n"),
    );
    expect("error" in parsed).toBe(true);
    if ("error" in parsed) {
      expect(parsed.error).toContain("duplicate email");
    }
  });

  it("rejects short passwords", () => {
    const parsed = parseOrganizationAdminUsersImportCsv(
      "email,name,password,role\nava@example.com,Ava,short,user\n",
    );
    expect("error" in parsed).toBe(true);
  });
});

describe("parseOrganizationAdminUsersImportJson", () => {
  it("accepts a users array wrapper", () => {
    const parsed = parseOrganizationAdminUsersImportJson(
      JSON.stringify({
        users: [
          {
            email: "minh@example.com",
            name: "Minh",
            password: "ChangeMe123!",
            role: "Admin",
          },
        ],
      }),
    );
    expect("users" in parsed).toBe(true);
    if ("users" in parsed) {
      expect(parsed.users[0]?.role).toBe("admin");
    }
  });
});

describe("parseOrganizationAdminUsersImportFile", () => {
  it("routes by extension", () => {
    const csv = parseOrganizationAdminUsersImportFile({
      filename: "users.csv",
      text: ORGANIZATION_ADMIN_USERS_IMPORT_TEMPLATE_CSV,
    });
    expect("users" in csv).toBe(true);

    const bad = parseOrganizationAdminUsersImportFile({
      filename: "users.xlsx",
      text: "x",
    });
    expect(bad).toEqual({ error: "Use a .csv or .json import file." });
  });
});
