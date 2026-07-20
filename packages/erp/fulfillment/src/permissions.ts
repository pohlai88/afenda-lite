export const FULFILLMENT_PERMISSION_READ = "fulfillment.read" as const;
export const FULFILLMENT_PERMISSION_MANAGE = "fulfillment.manage" as const;

export const FULFILLMENT_PERMISSION_CODES = [
	FULFILLMENT_PERMISSION_READ,
	FULFILLMENT_PERMISSION_MANAGE,
] as const;
