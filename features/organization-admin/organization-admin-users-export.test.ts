import { describe, expect, it } from "vitest";
import {
  organizationAdminUsersToCsv,
  organizationAdminUsersToJson,
} from "@/features/organization-admin/organization-admin-users-export";
import type { OrganizationAdminUserDisplay } from "@/features/organization-admin/organization-admin-users-map";

const sample: OrganizationAdminUserDisplay = {
  id: "11111111-1111-4111-8111-111111111111",
  name: 'Ava "Admin"',
  email: "ava@example.com",
  username: "ava",
  role: "Admin",
  plan: "Basic",
  billing: "Manual",
  status: "Active",
  company: "Afenda, Inc",
  country: "Singapore",
  contact: "+65 1",
  joinedDate: "2026-05-18T08:00:00.000Z",
  taxId: "—",
  language: "—",
};

describe("organizationAdminUsersToCsv", () => {
  it("escapes commas and quotes", () => {
    const csv = organizationAdminUsersToCsv([sample]);
    expect(csv).toContain("id,name,email");
    expect(csv).toContain('"Ava ""Admin"""');
    expect(csv).toContain('"Afenda, Inc"');
  });
});

describe("organizationAdminUsersToJson", () => {
  it("exports the directory columns", () => {
    const parsed = JSON.parse(organizationAdminUsersToJson([sample])) as Array<
      Record<string, string>
    >;
    expect(parsed[0]).toMatchObject({
      id: sample.id,
      name: sample.name,
      email: sample.email,
      role: "Admin",
      company: "Afenda, Inc",
    });
  });
});
