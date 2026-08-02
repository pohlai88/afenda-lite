import type { PayablesPermission } from "../execution/authorization";

/** Feature ids that may own Payables operations. */
export const PAYABLES_OPERATION_OWNERS = [
	"invoice-lifecycle",
	"credit-notes",
	"allocations",
	"supplier-balance",
] as const;
export type PayablesOperationOwner = (typeof PAYABLES_OPERATION_OWNERS)[number];

export interface PayablesOperationDeclaration {
	readonly id: `payables.${string}`;
	readonly kind: "command" | "query";
	readonly owner: PayablesOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: PayablesPermission;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type PayablesOperationDeclarationRegistry = Readonly<
	Record<string, PayablesOperationDeclaration>
>;
