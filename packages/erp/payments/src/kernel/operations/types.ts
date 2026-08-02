import type { PaymentsPermission } from "../execution/permissions";

/** Feature ids that may own Payments operations. */
export const PAYMENTS_OPERATION_OWNERS = [
	"payment-accounts",
	"payment-methods",
	"payment-lifecycle",
	"application-instructions",
] as const;
export type PaymentsOperationOwner = (typeof PAYMENTS_OPERATION_OWNERS)[number];

export interface PaymentsOperationDeclaration {
	/**
	 * Permissions the operation additionally enforces in code beyond the
	 * manifest-declared primary permission (e.g. transfer create + post).
	 */
	readonly additionalPermissions?: readonly PaymentsPermission[];
	readonly id: `payments.${string}`;
	readonly kind: "command" | "query";
	readonly owner: PaymentsOperationOwner;
	/** Primary permission — projected into the module manifest authorization map. */
	readonly permission: PaymentsPermission;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type PaymentsOperationDeclarationRegistry = Readonly<
	Record<string, PaymentsOperationDeclaration>
>;
