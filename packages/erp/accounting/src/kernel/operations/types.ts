import type { AccountingPermission } from "../execution/authorization";

/** Feature ids that may own Accounting operations. */
export const ACCOUNTING_OPERATION_OWNERS = [
	"ledger-master",
	"periods",
	"journals",
	"source-posting",
] as const;
export type AccountingOperationOwner =
	(typeof ACCOUNTING_OPERATION_OWNERS)[number];

export interface AccountingOperationDeclaration {
	readonly id: `accounting.${string}`;
	readonly kind: "command" | "query";
	readonly owner: AccountingOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: AccountingPermission;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type AccountingOperationDeclarationRegistry = Readonly<
	Record<string, AccountingOperationDeclaration>
>;
