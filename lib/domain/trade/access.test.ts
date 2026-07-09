import { describe, expect, it } from "vitest";
import {
  canSalesAccessTrade,
  canSalesViewOrder,
  isSalesMemberActive,
} from "@/lib/domain/trade/access";
import type { HotSalesSalesMember } from "@/lib/domain/trade/types";

const members: HotSalesSalesMember[] = [
  {
    id: "m1",
    userId: "u-sales",
    email: "sales@example.com",
    active: true,
  },
  {
    id: "m2",
    userId: null,
    email: "inactive@example.com",
    active: false,
  },
];

describe("Phase 1 allowlist (canSalesAccessTrade)", () => {
  it("allows shared admin without allowlist membership", () => {
    expect(canSalesAccessTrade(members, "admin@example.com", true)).toBe(true);
  });

  it("allows active allowlisted sales email", () => {
    expect(canSalesAccessTrade(members, "sales@example.com", false)).toBe(true);
    expect(canSalesAccessTrade(members, "  SALES@example.com  ", false)).toBe(
      true,
    );
  });

  it("denies inactive or unknown sales email", () => {
    expect(canSalesAccessTrade(members, "inactive@example.com", false)).toBe(
      false,
    );
    expect(canSalesAccessTrade(members, "unknown@example.com", false)).toBe(
      false,
    );
  });

  it("denies non-admin when allowlist is empty", () => {
    expect(canSalesAccessTrade([], "sales@example.com", false)).toBe(false);
  });
});

describe("isSalesMemberActive", () => {
  it("matches active members case-insensitively", () => {
    expect(isSalesMemberActive(members, "SALES@example.com")).toBe(true);
  });

  it("ignores inactive members", () => {
    expect(isSalesMemberActive(members, "inactive@example.com")).toBe(false);
  });
});

describe("canSalesViewOrder (Phase 1 own-order rule)", () => {
  it("allows admin to view any order", () => {
    expect(
      canSalesViewOrder({ salespersonUserId: "u2" }, "u1", true),
    ).toBe(true);
  });

  it("allows sales to view own orders only", () => {
    expect(canSalesViewOrder({ salespersonUserId: "u1" }, "u1", false)).toBe(
      true,
    );
    expect(canSalesViewOrder({ salespersonUserId: "u2" }, "u1", false)).toBe(
      false,
    );
  });
});
