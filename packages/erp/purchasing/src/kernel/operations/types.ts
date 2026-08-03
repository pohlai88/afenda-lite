import type { PURCHASING_PERMISSION_CODES } from "../execution/permissions";

export type PurchasingPermissionCode =
	(typeof PURCHASING_PERMISSION_CODES)[number];

/** Feature ids that may own Purchasing operations. */
export const PURCHASING_OPERATION_OWNERS = ["orders"] as const;
export type PurchasingOperationOwner =
	(typeof PURCHASING_OPERATION_OWNERS)[number];

export interface PurchasingOperationDeclaration {
	readonly id: `purchasing.${string}`;
	readonly kind: "command" | "query";
	readonly owner: PurchasingOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: PurchasingPermissionCode;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type PurchasingOperationDeclarationRegistry = Readonly<
	Record<string, PurchasingOperationDeclaration>
>;
