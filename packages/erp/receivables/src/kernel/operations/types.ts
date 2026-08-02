import type { RECEIVABLES_PERMISSION_CODES } from "../execution/permissions";

export type ReceivablesPermissionCode =
	(typeof RECEIVABLES_PERMISSION_CODES)[number];

/** Feature ids that may own Receivables operations. */
export const RECEIVABLES_OPERATION_OWNERS = ["invoices"] as const;
export type ReceivablesOperationOwner =
	(typeof RECEIVABLES_OPERATION_OWNERS)[number];

export interface ReceivablesOperationDeclaration {
	readonly id: `receivables.${string}`;
	readonly kind: "command" | "query";
	readonly owner: ReceivablesOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: ReceivablesPermissionCode;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type ReceivablesOperationDeclarationRegistry = Readonly<
	Record<string, ReceivablesOperationDeclaration>
>;
