/** Registered ERP vendor pack ids (2D-3). Customer forks add entries here + registry wiring. */
export const ERP_VENDOR_IDS = ["http-rest"] as const;

export type RegisteredErpVendorId = (typeof ERP_VENDOR_IDS)[number];

export function isRegisteredErpVendor(
  vendor: string,
): vendor is RegisteredErpVendorId {
  return (ERP_VENDOR_IDS as readonly string[]).includes(vendor);
}
