import type { HotSalesSalesMember } from "@/lib/domain/trade/types";

export function isSalesMemberActive(
  members: HotSalesSalesMember[],
  email: string,
): boolean {
  const normalized = email.trim().toLowerCase();
  return members.some(
    (m) => m.active && m.email.trim().toLowerCase() === normalized,
  );
}

export function canSalesAccessTrade(
  members: HotSalesSalesMember[],
  email: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) {
    return true;
  }
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
