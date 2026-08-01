import type { Role } from "@afenda/auth/client";
import {
	BoxesIcon,
	CreditCardIcon,
	DatabaseIcon,
	FileTextIcon,
	HandCoinsIcon,
	LandmarkIcon,
	type LucideIcon,
	PackageCheckIcon,
	ReceiptTextIcon,
	ShieldCheckIcon,
	ShoppingCartIcon,
	TruckIcon,
	UsersIcon,
} from "lucide-react";
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
	| "accounting"
	| "human-resources";

export type ShellNavKind = "module";

export type ShellNavSectionId =
	| "administration"
	| "commercial"
	| "operations"
	| "finance"
	| "people";

export const SHELL_NAV_SECTIONS: readonly Readonly<{
	id: ShellNavSectionId;
	label: string;
}>[] = [
	{ id: "administration", label: "Administration" },
	{ id: "commercial", label: "Commercial" },
	{ id: "operations", label: "Operations" },
	{ id: "finance", label: "Finance" },
	{ id: "people", label: "People" },
] as const;

export const SHELL_MODULE_PRESENTATION = Object.freeze({
	platform: { icon: ShieldCheckIcon, sectionId: "administration" },
	"master-data": { icon: DatabaseIcon, sectionId: "administration" },
	sales: { icon: ShoppingCartIcon, sectionId: "commercial" },
	purchasing: { icon: ReceiptTextIcon, sectionId: "commercial" },
	inventory: { icon: BoxesIcon, sectionId: "operations" },
	receiving: { icon: PackageCheckIcon, sectionId: "operations" },
	fulfillment: { icon: TruckIcon, sectionId: "operations" },
	receivables: { icon: HandCoinsIcon, sectionId: "finance" },
	payables: { icon: FileTextIcon, sectionId: "finance" },
	payments: { icon: CreditCardIcon, sectionId: "finance" },
	accounting: { icon: LandmarkIcon, sectionId: "finance" },
	"human-resources": { icon: UsersIcon, sectionId: "people" },
} satisfies Record<
	ShellNavModuleId,
	Readonly<{ icon: LucideIcon; sectionId: ShellNavSectionId }>
>);

export const SHELL_ROLE_PRESENTATION = Object.freeze({
	admin: { initials: "AD", label: "Administrator" },
	operator: { initials: "OP", label: "Operator" },
	client: { initials: "CL", label: "Client member" },
} satisfies Record<Role, Readonly<{ initials: string; label: string }>>);

/**
 * Module-tagged shell navigation (ARCH-015 · ARCH-018).
 * Only on-disk routes — no `/dashboard/*` or `/playground` (N17 / absent).
 */
export interface ShellNavItem {
	href: string;
	id: string;
	kind: ShellNavKind;
	label: string;
	moduleId: ShellNavModuleId;
	/** Any listed permission grants nav visibility (OR). */
	permissionCodes: readonly ProductPermissionCode[];
}

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
		permissionCodes: [
			"master_data.party_read",
			"master_data.item_read",
			"master_data.warehouse_read",
			"master_data.payment_term_read",
			"master_data.tax_registration_read",
			"master_data.change_request_read",
			"master_data.search_read",
		],
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
		id: "human-resources",
		label: "Human resources",
		href: "/admin/human-resources",
		moduleId: "human-resources",
		kind: "module",
		permissionCodes: [
			"human-resources.employee.read",
			"human-resources.requisition.create",
			"human-resources.candidate.manage",
			"human-resources.interview.read",
			"human-resources.interview.record",
			"human-resources.offer.approve",
			"human-resources.hire.orchestrate",
			"human-resources.organization.read",
			"human-resources.onboarding.manage",
			"human-resources.offboarding.manage",
			"human-resources.employment.manage",
			"human-resources.compliance.administer",
			"human-resources.employee-case.open",
			"human-resources.employee-case.assigned.read",
			"human-resources.workforce-plan.read",
			"human-resources.workforce-plan.prepare",
			"human-resources.compensation.read",
			"human-resources.compensation.manage",
			"human-resources.benefits.manage",
		],
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
		permissionCodes: [
			"master_data.party_read",
			"master_data.item_read",
			"master_data.warehouse_read",
			"master_data.payment_term_read",
			"master_data.tax_registration_read",
			"master_data.change_request_read",
			"master_data.search_read",
		],
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
		id: "human-resources",
		label: "Human resources",
		href: "/client/human-resources",
		moduleId: "human-resources",
		kind: "module",
		permissionCodes: [
			"human-resources.employee.read",
			"human-resources.leave-policy.read",
			"human-resources.leave-entitlement.read",
			"human-resources.leave-request.own",
			"human-resources.leave-request.approve-team",
			"human-resources.time.attendance.self.record",
			"human-resources.time.attendance.read",
			"human-resources.time.timesheet.self.read",
			"human-resources.time.timesheet.read",
			"human-resources.learning.manage",
			"human-resources.certification.manage",
			"human-resources.performance.own.read",
			"human-resources.employee-document.own.read",
			"human-resources.compliance.administer",
			"human-resources.policy-acknowledgement.administer",
		],
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
