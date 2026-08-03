import type { RECEIVING_PERMISSION_CODES } from "../execution/permissions";

export type ReceivingPermissionCode =
	(typeof RECEIVING_PERMISSION_CODES)[number];

/** Feature ids that may own Receiving operations. */
export const RECEIVING_OPERATION_OWNERS = ["receipts"] as const;
export type ReceivingOperationOwner =
	(typeof RECEIVING_OPERATION_OWNERS)[number];

export interface ReceivingOperationDeclaration {
	readonly id: `receiving.${string}`;
	readonly kind: "command" | "query";
	readonly owner: ReceivingOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: ReceivingPermissionCode;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type ReceivingOperationDeclarationRegistry = Readonly<
	Record<string, ReceivingOperationDeclaration>
>;
