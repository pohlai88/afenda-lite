import type { FULFILLMENT_PERMISSION_CODES } from "../execution/permissions";

export type FulfillmentPermissionCode =
	(typeof FULFILLMENT_PERMISSION_CODES)[number];

/** Feature ids that may own Fulfillment operations. */
export const FULFILLMENT_OPERATION_OWNERS = ["deliveries"] as const;
export type FulfillmentOperationOwner =
	(typeof FULFILLMENT_OPERATION_OWNERS)[number];

export interface FulfillmentOperationDeclaration {
	readonly id: `fulfillment.${string}`;
	readonly kind: "command" | "query";
	readonly owner: FulfillmentOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: FulfillmentPermissionCode;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type FulfillmentOperationDeclarationRegistry = Readonly<
	Record<string, FulfillmentOperationDeclaration>
>;
