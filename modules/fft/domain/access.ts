import type { FftSalesMember } from "@/modules/fft/domain/types";

export function isSalesMemberActive(
  members: FftSalesMember[],
  email: string,
): boolean {
  const normalized = email.trim().toLowerCase();
  return members.some(
    (m) => m.active && m.email.trim().toLowerCase() === normalized,
  );
}

/**
 * Roster helper: active sales-member email match.
 * Module entry is platform `fft.access` — this is not an entry grant.
 */
export function canSalesAccessFft(
  members: FftSalesMember[],
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
