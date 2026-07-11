import { describe, expect, it } from "vitest";
import { asUserId } from "@/modules/identity/schemas/users";
import { mapOrganizationUserToDisplay } from "@/features/organization-admin/organization-admin-users-map";
import {
  ORGANIZATION_ADMIN_USERS_HREF,
  organizationAdminUserHref,
} from "@/modules/platform/routing/portal-routes";

describe("mapOrganizationUserToDisplay", () => {
  it("maps admin auth role and active status", () => {
    const display = mapOrganizationUserToDisplay({
      id: asUserId("11111111-1111-4111-8111-111111111111"),
      email: "ava@example.com",
      name: "Ava Rodriguez",
      role: "admin",
      emailVerified: true,
      banned: false,
      banReason: null,
      createdAt: new Date("2026-05-18T08:00:00.000Z"),
    });

    expect(display).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Ava Rodriguez",
      email: "ava@example.com",
      username: "ava",
      role: "Admin",
      status: "Active",
      plan: "Basic",
      billing: "Manual",
      company: "—",
      joinedDate: "2026-05-18T08:00:00.000Z",
    });
    expect(organizationAdminUserHref(display.id)).toBe(
      `${ORGANIZATION_ADMIN_USERS_HREF}/11111111-1111-4111-8111-111111111111`,
    );
  });

  it("enriches company/country/contact from client profile summary", () => {
    const display = mapOrganizationUserToDisplay(
      {
        id: asUserId("22222222-2222-4222-8222-222222222222"),
        email: "minh@example.com",
        name: null,
        role: "user",
        emailVerified: false,
        banned: false,
        banReason: null,
        createdAt: new Date("2026-06-24T08:00:00.000Z"),
      },
      {
        userId: "22222222-2222-4222-8222-222222222222",
        fullLegalName: "Minh Nguyen",
        entityName: "Viet Farm Trading",
        countryOfResidence: "Vietnam",
        phone: "+84 28 3822 1000",
      },
    );

    expect(display).toMatchObject({
      name: "Minh Nguyen",
      role: "Guest",
      status: "Pending",
      company: "Viet Farm Trading",
      country: "Vietnam",
      contact: "+84 28 3822 1000",
    });
  });

  it("maps banned → Suspended", () => {
    expect(
      mapOrganizationUserToDisplay({
        id: asUserId("33333333-3333-4333-8333-333333333333"),
        email: "banned@example.com",
        name: "Banned User",
        role: "user",
        emailVerified: true,
        banned: true,
        banReason: "abuse",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }).status,
    ).toBe("Suspended");
  });
});
