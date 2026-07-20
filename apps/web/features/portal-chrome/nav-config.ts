import { OPERATOR_ADMIN_PATH } from "@/features/auth/operator-paths";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";

export type ShellNavModuleId =
	| "platform"
	| "master-data"
	| "sales"
	| "purchasing"
	| "inventory"
	| "receiving"
	| "fulfillment"
	| "receivables"
	| "payables"
	| "payments"
	| "accounting";

export type ShellNavKind = "module";

/**
 * Module-tagged shell navigation (ARCH-015 · ARCH-018).
 * Only on-disk routes — no `/dashboard/*` or `/playground` (N17 / absent).
 */
export type ShellNavItem = {
	id: string;
	label: string;
	href: string;
	moduleId: ShellNavModuleId;
	kind: ShellNavKind;
	/** Any listed permission grants nav visibility (OR). */
	permissionCodes: readonly ProductPermissionCode[];
};

/** Operator `/admin/*` modules — permission-gated. */
export const OPERATOR_SHELL_NAV: readonly ShellNavItem[] = [
	{
		id: "org-admin",
		label: "Operator admin",
		href: OPERATOR_ADMIN_PATH,
		moduleId: "platform",
		kind: "module",
		permissionCodes: ["org.roles.manage", "clients.invite"],
	},
	{
		id: "master-data",
		label: "Master data",
		href: "/admin/master-data",
		moduleId: "master-data",
		kind: "module",
		permissionCodes: ["master_data.read"],
	},
	{
		id: "sales",
		label: "Sales",
		href: "/admin/sales",
		moduleId: "sales",
		kind: "module",
		permissionCodes: ["sales.order.read"],
	},
	{
		id: "purchasing",
		label: "Purchasing",
		href: "/admin/purchasing",
		moduleId: "purchasing",
		kind: "module",
		permissionCodes: ["purchasing.order.read"],
	},
	{
		id: "inventory",
		label: "Inventory",
		href: "/admin/inventory",
		moduleId: "inventory",
		kind: "module",
		permissionCodes: ["inventory.movement.read"],
	},
	{
		id: "receiving",
		label: "Receiving",
		href: "/admin/receiving",
		moduleId: "receiving",
		kind: "module",
		permissionCodes: ["receiving.receipt.read"],
	},
	{
		id: "fulfillment",
		label: "Fulfillment",
		href: "/admin/fulfillment",
		moduleId: "fulfillment",
		kind: "module",
		permissionCodes: ["fulfillment.delivery.read"],
	},
	{
		id: "receivables",
		label: "Receivables",
		href: "/admin/receivables",
		moduleId: "receivables",
		kind: "module",
		permissionCodes: ["receivables.invoice.read"],
	},
	{
		id: "payables",
		label: "Payables",
		href: "/admin/payables",
		moduleId: "payables",
		kind: "module",
		permissionCodes: ["payables.read"],
	},
	{
		id: "payments",
		label: "Payments",
		href: "/admin/payments",
		moduleId: "payments",
		kind: "module",
		permissionCodes: ["payments.payment.read"],
	},
	{
		id: "accounting",
		label: "Accounting",
		href: "/admin/accounting",
		moduleId: "accounting",
		kind: "module",
		permissionCodes: ["accounting.journal.read"],
	},
] as const;

/**
 * Client `/client/*` workspace modules — read surfaces; mutations stay operator-gated
 * where Actions require `requireRole("operator")`.
 */
export const CLIENT_SHELL_NAV: readonly ShellNavItem[] = [
	{
		id: "master-data",
		label: "Master data",
		href: "/client/master-data",
		moduleId: "master-data",
		kind: "module",
		permissionCodes: ["master_data.read"],
	},
	{
		id: "sales",
		label: "Sales",
		href: "/client/sales",
		moduleId: "sales",
		kind: "module",
		permissionCodes: ["sales.order.read"],
	},
	{
		id: "purchasing",
		label: "Purchasing",
		href: "/client/purchasing",
		moduleId: "purchasing",
		kind: "module",
		permissionCodes: ["purchasing.order.read"],
	},
	{
		id: "inventory",
		label: "Inventory",
		href: "/client/inventory",
		moduleId: "inventory",
		kind: "module",
		permissionCodes: ["inventory.movement.read"],
	},
	{
		id: "receiving",
		label: "Receiving",
		href: "/client/receiving",
		moduleId: "receiving",
		kind: "module",
		permissionCodes: ["receiving.receipt.read"],
	},
	{
		id: "fulfillment",
		label: "Fulfillment",
		href: "/client/fulfillment",
		moduleId: "fulfillment",
		kind: "module",
		permissionCodes: ["fulfillment.delivery.read"],
	},
	{
		id: "receivables",
		label: "Receivables",
		href: "/client/receivables",
		moduleId: "receivables",
		kind: "module",
		permissionCodes: ["receivables.invoice.read"],
	},
	{
		id: "payables",
		label: "Payables",
		href: "/client/payables",
		moduleId: "payables",
		kind: "module",
		permissionCodes: ["payables.read"],
	},
	{
		id: "payments",
		label: "Payments",
		href: "/client/payments",
		moduleId: "payments",
		kind: "module",
		permissionCodes: ["payments.payment.read"],
	},
	{
		id: "accounting",
		label: "Accounting",
		href: "/client/accounting",
		moduleId: "accounting",
		kind: "module",
		permissionCodes: ["accounting.journal.read"],
	},
] as const;
