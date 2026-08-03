import type { SalesPermission } from "../execution/permissions";

/** Feature ids that may own Sales operations. */
export const SALES_OPERATION_OWNERS = [
	"commercial-pricing",
	"quotation-management",
	"order-management",
	"approvals-and-holds",
	"return-authorizations",
] as const;
export type SalesOperationOwner = (typeof SALES_OPERATION_OWNERS)[number];

export interface SalesOperationDeclaration {
	readonly id: `sales.${string}`;
	readonly kind: "command" | "query";
	readonly owner: SalesOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: SalesPermission;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type SalesOperationDeclarationRegistry = Readonly<
	Record<string, SalesOperationDeclaration>
>;
