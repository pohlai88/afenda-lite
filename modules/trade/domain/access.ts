import type { HotSalesSalesMember } from "@/modules/trade/domain/types";

export function isSalesMemberActive(
  members: HotSalesSalesMember[],
  email: string,
): boolean {
  const normalized = email.trim().toLowerCase();
  return members.some(
    (m) => m.active && m.email.trim().toLowerCase() === normalized,
  );
}

/**
 * Phase 1 allowlist check for Feed Farm Trade module entry.
 * Organization admin alone does **not** grant access — pass `isAdmin` only for
 * call-site clarity; it is ignored (Feed Farm Trade permission / allowlist required).
 */
export function canSalesAccessTrade(
  members: HotSalesSalesMember[],
  email: string,
  _isAdmin = false,
): boolean {
  return isSalesMemberActive(members, email);
}

export function canSalesViewOrder(
  order: { salespersonUserId: string },
  sessionUserId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) {
    return true;
  }
  return order.salespersonUserId === sessionUserId;
}
