import { describe, expect, it } from "vitest";
import {
  asUserId,
  banOrganizationUserSchema,
  setOrganizationUserRoleSchema,
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

  it("accepts set-role and ban payloads", () => {
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
  });
});
