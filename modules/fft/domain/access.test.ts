import { describe, expect, it } from "vitest";
import {
  canSalesAccessFft,
  canSalesViewOrder,
  isSalesMemberActive,
} from "@/modules/fft/domain/access";
import type { FftSalesMember } from "@/modules/fft/domain/types";

const members: FftSalesMember[] = [
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

describe("Phase 1 allowlist (canSalesAccessFft)", () => {
  it("does not grant Feed Farm Trade to org admin without allowlist membership", () => {
    expect(canSalesAccessFft(members, "admin@example.com", true)).toBe(false);
  });

  it("allows active allowlisted sales email", () => {
    expect(canSalesAccessFft(members, "sales@example.com", false)).toBe(true);
    expect(canSalesAccessFft(members, "  SALES@example.com  ", false)).toBe(
      true,
    );
  });

  it("denies inactive or unknown sales email", () => {
    expect(canSalesAccessFft(members, "inactive@example.com", false)).toBe(
      false,
    );
    expect(canSalesAccessFft(members, "unknown@example.com", false)).toBe(
      false,
    );
  });

  it("denies when allowlist is empty", () => {
    expect(canSalesAccessFft([], "sales@example.com", false)).toBe(false);
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
