import { describe, expect, it } from "vitest";
import {
  asUserId,
  banOrganizationUserSchema,
  banOrganizationUsersSchema,
  createOrganizationUserSchema,
  importOrganizationUsersSchema,
  organizationUserIdsSchema,
  setOrganizationUserRoleSchema,
  updateOrganizationUserSchema,
  userIdSchema,
} from "@/modules/identity/schemas/users";

describe("identity user schemas", () => {
  it("brands valid uuid as UserId", () => {
    const parsed = userIdSchema.safeParse(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe(asUserId(parsed.data));
    }
  });

  it("rejects non-uuid userId", () => {
    expect(userIdSchema.safeParse("user-001").success).toBe(false);
  });

  it("accepts create / update / set-role / ban payloads", () => {
    expect(
      createOrganizationUserSchema.safeParse({
        email: "ava@example.com",
        password: "password1",
        name: "Ava",
        role: "admin",
      }).success,
    ).toBe(true);

    expect(
      createOrganizationUserSchema.safeParse({
        email: "ava@example.com",
        password: "short",
        name: "Ava",
      }).success,
    ).toBe(false);

    expect(
      updateOrganizationUserSchema.safeParse({
        userId: "11111111-1111-4111-8111-111111111111",
        name: "Ava Rodriguez",
        role: "user",
      }).success,
    ).toBe(true);

    expect(
      setOrganizationUserRoleSchema.safeParse({
        userId: "11111111-1111-4111-8111-111111111111",
        role: "admin",
      }).success,
    ).toBe(true);

    expect(
      banOrganizationUserSchema.safeParse({
        userId: "11111111-1111-4111-8111-111111111111",
        banReason: "Suspended by organization admin",
      }).success,
    ).toBe(true);

    expect(
      organizationUserIdsSchema.safeParse({
        userIds: ["11111111-1111-4111-8111-111111111111"],
      }).success,
    ).toBe(true);

    expect(
      organizationUserIdsSchema.safeParse({
        userIds: [],
      }).success,
    ).toBe(false);

    expect(
      banOrganizationUsersSchema.safeParse({
        userIds: ["11111111-1111-4111-8111-111111111111"],
        banReason: "Bulk suspend",
      }).success,
    ).toBe(true);

    expect(
      importOrganizationUsersSchema.safeParse({
        users: [
          {
            email: "ava@example.com",
            name: "Ava",
            password: "password1",
            role: "Admin",
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      importOrganizationUsersSchema.safeParse({
        users: Array.from({ length: 51 }, (_, index) => ({
          email: `user${index}@example.com`,
          name: `User ${index}`,
          password: "password1",
          role: "user",
        })),
      }).success,
    ).toBe(false);
  });
});
