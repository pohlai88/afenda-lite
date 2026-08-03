import type { CorporateAdministrationPermission } from "../execution/authorization";

/** Feature ids that may own Corporate Administration operations. */
export const CORPORATE_ADMINISTRATION_OPERATION_OWNERS = [
	"establishments",
] as const;
export type CorporateAdministrationOperationOwner =
	(typeof CORPORATE_ADMINISTRATION_OPERATION_OWNERS)[number];

export interface CorporateAdministrationOperationDeclaration {
	readonly id: `corporate_administration.${string}`;
	readonly kind: "command" | "query";
	readonly owner: CorporateAdministrationOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: CorporateAdministrationPermission;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type CorporateAdministrationOperationDeclarationRegistry = Readonly<
	Record<string, CorporateAdministrationOperationDeclaration>
>;
