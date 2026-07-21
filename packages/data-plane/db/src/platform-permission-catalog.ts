/**
 * ARCH-023 §3.2 — platform permission catalog v1 + system role templates.
 *
 * Adding a code is a release. Domain vertical catalogs are absent after the
 * declarations/FFT wipe — only platform / org / account codes remain.
 */
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";

import type { Database } from "./client";
import {
	platformPermission,
	platformRole,
	platformRolePermission,
} from "./schema/platform";

/** Seed permission codes (v1) — ARCH-023 §3.2 (shell after domain wipe). */
export const PLATFORM_PERMISSION_V1 = [
	{
		code: "org.users.manage",
		module: "org",
		description: "Create, update, ban, and remove organization users",
		sensitive: true,
	},
	{
		code: "org.roles.manage",
		module: "org",
		description: "Manage platform roles and assignments",
		sensitive: true,
	},
	{
		code: "clients.invite",
		module: "org",
		description: "Invite members to the organization",
		sensitive: false,
	},
	{
		code: "account.self",
		module: "account",
		description: "Manage own account settings",
		sensitive: false,
	},
	{
		code: "master_data.read",
		module: "master_data",
		description: "Read organization master data (party, item, warehouse)",
		sensitive: false,
	},
	{
		code: "master_data.manage",
		module: "master_data",
		description: "Create and mutate organization master data",
		sensitive: true,
	},
	{
		code: "master_data.approve",
		module: "master_data",
		description: "Approve or reject master-data change requests (checker)",
		sensitive: true,
	},
	{
		code: "master_data.import_approve",
		module: "master_data",
		description: "Approve and apply master-data bulk import",
		sensitive: true,
	},
	{
		code: "sales.order.create",
		module: "sales",
		description: "Create draft sales orders",
		sensitive: true,
	},
	{
		code: "sales.order.update",
		module: "sales",
		description: "Add or update lines on draft sales orders",
		sensitive: true,
	},
	{
		code: "sales.order.post",
		module: "sales",
		description: "Post draft sales orders and freeze snapshots",
		sensitive: true,
	},
	{
		code: "sales.order.cancel",
		module: "sales",
		description: "Cancel draft or posted sales orders",
		sensitive: true,
	},
	{
		code: "sales.order.read",
		module: "sales",
		description: "Read a single sales order by id",
		sensitive: false,
	},
	{
		code: "sales.order.list",
		module: "sales",
		description: "List organization sales orders",
		sensitive: false,
	},
	{
		code: "purchasing.order.create",
		module: "purchasing",
		description: "Create draft purchase orders",
		sensitive: true,
	},
	{
		code: "purchasing.order.update",
		module: "purchasing",
		description: "Add or update lines on draft purchase orders",
		sensitive: true,
	},
	{
		code: "purchasing.order.post",
		module: "purchasing",
		description: "Post draft purchase orders and freeze snapshots",
		sensitive: true,
	},
	{
		code: "purchasing.order.cancel",
		module: "purchasing",
		description: "Cancel draft purchase orders",
		sensitive: true,
	},
	{
		code: "purchasing.order.close",
		module: "purchasing",
		description:
			"Close posted purchase orders (terminate remaining commitment)",
		sensitive: true,
	},
	{
		code: "purchasing.order.read",
		module: "purchasing",
		description: "Read a single purchase order by id",
		sensitive: false,
	},
	{
		code: "purchasing.order.list",
		module: "purchasing",
		description: "List organization purchase orders",
		sensitive: false,
	},
	{
		code: "inventory.movement.create",
		module: "inventory",
		description: "Create draft stock movements and add lines",
		sensitive: true,
	},
	{
		code: "inventory.movement.post",
		module: "inventory",
		description: "Post stock movements and create compensating reversals",
		sensitive: true,
	},
	{
		code: "inventory.movement.cancel",
		module: "inventory",
		description: "Cancel draft stock movements",
		sensitive: true,
	},
	{
		code: "inventory.movement.read",
		module: "inventory",
		description: "Read and list organization stock movements",
		sensitive: false,
	},
	{
		code: "inventory.reservation.create",
		module: "inventory",
		description: "Create stock reservations",
		sensitive: true,
	},
	{
		code: "inventory.reservation.release",
		module: "inventory",
		description: "Release active stock reservations",
		sensitive: true,
	},
	{
		code: "inventory.availability.read",
		module: "inventory",
		description: "Read organization stock availability",
		sensitive: false,
	},
	{
		code: "inventory.adjustment.post",
		module: "inventory",
		description: "Create and post manual stock adjustments",
		sensitive: true,
	},
	{
		code: "receiving.receipt.read",
		module: "receiving",
		description: "Read organization goods receipts and discrepancies",
		sensitive: false,
	},
	{
		code: "receiving.receipt.create",
		module: "receiving",
		description: "Create draft goods receipts",
		sensitive: true,
	},
	{
		code: "receiving.receipt.update",
		module: "receiving",
		description: "Add and update lines on draft goods receipts",
		sensitive: true,
	},
	{
		code: "receiving.receipt.post",
		module: "receiving",
		description: "Post draft goods receipts to inventory",
		sensitive: true,
	},
	{
		code: "receiving.receipt.cancel",
		module: "receiving",
		description: "Cancel draft goods receipts",
		sensitive: true,
	},
	{
		code: "receiving.receipt.reverse",
		module: "receiving",
		description: "Reverse posted goods receipts with compensating documents",
		sensitive: true,
	},
	{
		code: "receiving.discrepancy.record",
		module: "receiving",
		description: "Record receiving discrepancies",
		sensitive: true,
	},
	{
		code: "receiving.discrepancy.resolve",
		module: "receiving",
		description: "Resolve receiving discrepancies",
		sensitive: true,
	},
	{
		code: "fulfillment.delivery.read",
		module: "fulfillment",
		description:
			"Read organization deliveries, picks, packs, and proof of delivery",
		sensitive: false,
	},
	{
		code: "fulfillment.delivery.create",
		module: "fulfillment",
		description: "Create draft deliveries",
		sensitive: true,
	},
	{
		code: "fulfillment.delivery.update",
		module: "fulfillment",
		description: "Add and update lines on draft deliveries",
		sensitive: true,
	},
	{
		code: "fulfillment.picking.confirm",
		module: "fulfillment",
		description: "Start and confirm picking operations",
		sensitive: true,
	},
	{
		code: "fulfillment.packing.confirm",
		module: "fulfillment",
		description: "Confirm packing operations",
		sensitive: true,
	},
	{
		code: "fulfillment.delivery.post",
		module: "fulfillment",
		description: "Post deliveries and issue inventory",
		sensitive: true,
	},
	{
		code: "fulfillment.delivery.cancel",
		module: "fulfillment",
		description: "Cancel draft, picking, or packed deliveries before post",
		sensitive: true,
	},
	{
		code: "fulfillment.pod.record",
		module: "fulfillment",
		description: "Record proof of delivery and mark as delivered",
		sensitive: true,
	},
	{
		code: "fulfillment.delivery.close",
		module: "fulfillment",
		description: "Close delivered deliveries",
		sensitive: true,
	},
	{
		code: "receivables.invoice.read",
		module: "receivables",
		description: "Read organization sales invoices",
		sensitive: false,
	},
	{
		code: "receivables.invoice.create",
		module: "receivables",
		description: "Create draft sales invoices",
		sensitive: true,
	},
	{
		code: "receivables.invoice.update",
		module: "receivables",
		description: "Update draft sales invoices and lines",
		sensitive: true,
	},
	{
		code: "receivables.invoice.post",
		module: "receivables",
		description: "Post sales invoices",
		sensitive: true,
	},
	{
		code: "receivables.invoice.cancel",
		module: "receivables",
		description: "Cancel draft sales invoices",
		sensitive: true,
	},
	{
		code: "receivables.invoice.close",
		module: "receivables",
		description: "Close fully settled sales invoices",
		sensitive: true,
	},
	{
		code: "receivables.credit_note.issue",
		module: "receivables",
		description: "Issue sales credit notes",
		sensitive: true,
	},
	{
		code: "receivables.receipt.apply",
		module: "receivables",
		description: "Apply posted customer receipts to invoices",
		sensitive: true,
	},
	{
		code: "receivables.receipt_application.reverse",
		module: "receivables",
		description: "Reverse customer receipt applications",
		sensitive: true,
	},
	{
		code: "receivables.balance.read",
		module: "receivables",
		description: "Read customer AR balances",
		sensitive: false,
	},
	{
		code: "receivables.aging.read",
		module: "receivables",
		description: "Read customer AR aging",
		sensitive: false,
	},
	{
		code: "payables.read",
		module: "payables",
		description:
			"Read organization supplier invoices, credit notes, matches, allocations, and balances",
		sensitive: false,
	},
	{
		code: "payables.manage",
		module: "payables",
		description:
			"Create, match, post, cancel, and allocate organization payables",
		sensitive: true,
	},
	...([
		[
			"payments.payment.read",
			"Read payments and their application instructions",
			false,
		],
		["payments.payment.create", "Create draft payments", true],
		["payments.payment.update", "Update draft payments", true],
		["payments.payment.post", "Post payments (settle money movement)", true],
		["payments.payment.reverse", "Reverse posted payments", true],
		["payments.refund.create", "Create refund instructions", true],
		["payments.refund.post", "Post refunds", true],
		["payments.transfer.create", "Create internal payment transfers", true],
		["payments.transfer.post", "Post internal payment transfers", true],
		[
			"payments.application_instruction.manage",
			"Manage payment application instructions",
			true,
		],
		["payments.account.manage", "Manage payment accounts", true],
		["payments.account.read", "Read payment accounts", false],
		[
			"payments.availability.read",
			"Read payment application availability",
			false,
		],
	].map(([code, description, sensitive]) => ({
		code,
		module: "payments",
		description,
		sensitive,
	})) as Array<{
		code: string;
		module: string;
		description: string;
		sensitive: boolean;
	}>),
	{
		code: "accounting.journal.read",
		module: "accounting",
		description: "Read organization journals and ledger postings",
		sensitive: false,
	},
	{
		code: "accounting.journal.create",
		module: "accounting",
		description: "Create draft journals and add journal lines",
		sensitive: true,
	},
	{
		code: "accounting.journal.update",
		module: "accounting",
		description: "Update draft journals and journal lines",
		sensitive: true,
	},
	{
		code: "accounting.journal.post",
		module: "accounting",
		description: "Post balanced draft journals to the ledger",
		sensitive: true,
	},
	{
		code: "accounting.journal.reverse",
		module: "accounting",
		description: "Reverse posted journals with compensating entries",
		sensitive: true,
	},
	{
		code: "accounting.trial_balance.read",
		module: "accounting",
		description: "Read organization trial balance",
		sensitive: false,
	},
	{
		code: "accounting.ledger.read",
		module: "accounting",
		description: "Read ledger account activity and source posting traces",
		sensitive: false,
	},
	{
		code: "accounting.period.read",
		module: "accounting",
		description: "Read organization accounting periods",
		sensitive: false,
	},
	{
		code: "accounting.period.open",
		module: "accounting",
		description: "Open new accounting periods",
		sensitive: true,
	},
	{
		code: "accounting.period.soft_close",
		module: "accounting",
		description: "Soft-close open accounting periods",
		sensitive: true,
	},
	{
		code: "accounting.period.close",
		module: "accounting",
		description: "Close soft-closed accounting periods",
		sensitive: true,
	},
	{
		code: "accounting.period.reopen",
		module: "accounting",
		description: "Reopen soft-closed or closed accounting periods",
		sensitive: true,
	},
	{
		code: "accounting.account.read",
		module: "accounting",
		description: "Read charts of accounts, ledger accounts, and role mappings",
		sensitive: false,
	},
	{
		code: "accounting.account.manage",
		module: "accounting",
		description:
			"Create and manage charts of accounts, ledger accounts, and role mappings",
		sensitive: true,
	},
	{
		code: "accounting.posting_rule.manage",
		module: "accounting",
		description: "Manage posting profiles and posting profile lines",
		sensitive: true,
	},
	{
		code: "accounting.exception.read",
		module: "accounting",
		description: "Read financial posting exceptions",
		sensitive: false,
	},
	{
		code: "accounting.exception.manage",
		module: "accounting",
		description: "Resolve and retry financial posting exceptions",
		sensitive: true,
	},
	{
		code: "human-resources.employee.create",
		module: "human_resources",
		description: "Create employee records",
		sensitive: true,
	},
	{
		code: "human-resources.employee.read",
		module: "human_resources",
		description: "Read employee directory records",
		sensitive: false,
	},
	{
		code: "human-resources.employee.update",
		module: "human_resources",
		description: "Update employee records",
		sensitive: true,
	},
	{
		code: "human-resources.employment.manage",
		module: "human_resources",
		description: "Manage employment relationships and contracts",
		sensitive: true,
	},
	{
		code: "human-resources.requisition.create",
		module: "human_resources",
		description: "Create job requisitions",
		sensitive: true,
	},
	{
		code: "human-resources.candidate.manage",
		module: "human_resources",
		description: "Manage candidates and applications",
		sensitive: true,
	},
	{
		code: "human-resources.interview.record",
		module: "human_resources",
		description: "Record interviews and evaluations",
		sensitive: true,
	},
	{
		code: "human-resources.offer.approve",
		module: "human_resources",
		description: "Approve employment offers",
		sensitive: true,
	},
	{
		code: "human-resources.onboarding.manage",
		module: "human_resources",
		description: "Manage onboarding cases and tasks",
		sensitive: true,
	},
	{
		code: "human-resources.offboarding.manage",
		module: "human_resources",
		description: "Manage offboarding cases and clearance",
		sensitive: true,
	},
	{
		code: "human-resources.leave.request",
		module: "human_resources",
		description: "Submit leave requests",
		sensitive: false,
	},
	{
		code: "human-resources.leave.approve",
		module: "human_resources",
		description: "Approve or reject leave requests",
		sensitive: true,
	},
	{
		code: "human-resources.attendance.manage",
		module: "human_resources",
		description: "Manage attendance events and records",
		sensitive: true,
	},
	{
		code: "human-resources.timesheet.approve",
		module: "human_resources",
		description: "Approve employee timesheets",
		sensitive: true,
	},
	{
		code: "human-resources.performance.manage",
		module: "human_resources",
		description: "Manage performance cycles, goals, and reviews",
		sensitive: true,
	},
	{
		code: "human-resources.learning.manage",
		module: "human_resources",
		description: "Manage learning programs and assignments",
		sensitive: true,
	},
	{
		code: "human-resources.certification.manage",
		module: "human_resources",
		description: "Manage employee certifications",
		sensitive: true,
	},
	{
		code: "human-resources.compensation.read",
		module: "human_resources",
		description: "Read compensation and benefits agreements",
		sensitive: true,
	},
	{
		code: "human-resources.compensation.manage",
		module: "human_resources",
		description: "Manage compensation agreements and reviews",
		sensitive: true,
	},
	{
		code: "human-resources.benefits.manage",
		module: "human_resources",
		description: "Manage benefit plans and enrollments",
		sensitive: true,
	},
	{
		code: "payroll.setup.manage",
		module: "payroll",
		description: "Manage payroll calendars, pay groups, and rules",
		sensitive: true,
	},
	{
		code: "payroll.input.manage",
		module: "payroll",
		description: "Manage payroll period inputs and adjustments",
		sensitive: true,
	},
	{
		code: "payroll.run.create",
		module: "payroll",
		description: "Create payroll runs",
		sensitive: true,
	},
	{
		code: "payroll.run.calculate",
		module: "payroll",
		description: "Calculate payroll runs",
		sensitive: true,
	},
	{
		code: "payroll.run.review",
		module: "payroll",
		description: "Review payroll run results and exceptions",
		sensitive: true,
	},
	{
		code: "payroll.run.finalize",
		module: "payroll",
		description: "Finalize payroll runs",
		sensitive: true,
	},
	{
		code: "payroll.run.reverse",
		module: "payroll",
		description: "Reverse finalized payroll runs",
		sensitive: true,
	},
	{
		code: "payroll.payslip.read-own",
		module: "payroll",
		description: "Read own payslips",
		sensitive: false,
	},
	{
		code: "payroll.payslip.read-all",
		module: "payroll",
		description: "Read all organization payslips",
		sensitive: true,
	},
	{
		code: "payroll.reconciliation.manage",
		module: "payroll",
		description: "Manage payroll reconciliation",
		sensitive: true,
	},
] as const;

/** Retired v1 codes removed by the domain wipe / S15 cutover or fine-grained split — deleted on ensure. */
const RETIRED_PLATFORM_PERMISSION_CODES = [
	"declarations.manage",
	"declarations.read",
	"fft.access",
	"sales.read",
	"sales.manage",
	"inventory.read",
	"inventory.manage",
	"fulfillment.read",
	"fulfillment.manage",
	"receivables.read",
	"receivables.manage",
	"payments.read",
	"payments.manage",
	"accounting.read",
	"accounting.manage",
] as const;

export type PlatformPermissionV1 = (typeof PLATFORM_PERMISSION_V1)[number];

export type PlatformPermissionCodeV1 = PlatformPermissionV1["code"];

export const PLATFORM_PERMISSION_CODES_V1: readonly PlatformPermissionCodeV1[] =
	PLATFORM_PERMISSION_V1.map((row) => row.code);

const PLATFORM_PERMISSION_CODE_SET = new Set<string>(
	PLATFORM_PERMISSION_CODES_V1,
);

/** True when `code` is an ARCH-023 v1 platform permission code. */
export function isPlatformPermissionCodeV1(
	code: string,
): code is PlatformPermissionCodeV1 {
	return PLATFORM_PERMISSION_CODE_SET.has(code);
}

export type PlatformRoleTemplateV1 = {
	templateKey: string;
	name: string;
	description: string;
	permissionCodes: readonly PlatformPermissionCodeV1[];
};

const ALL_V1_CODES = PLATFORM_PERMISSION_CODES_V1;

/** Seed role templates (display names only) — ARCH-023 §3.2. */
export const PLATFORM_ROLE_TEMPLATES_V1: readonly PlatformRoleTemplateV1[] = [
	{
		templateKey: "org_admin",
		name: "Org Admin",
		description: "Full organization administration (all v1 platform codes)",
		permissionCodes: ALL_V1_CODES,
	},
	{
		templateKey: "editor",
		name: "Editor",
		description:
			"Org invite + master-data manage + account self (no MDG/import approve)",
		permissionCodes: [
			"clients.invite",
			"account.self",
			"master_data.read",
			"master_data.manage",
			"sales.order.create",
			"sales.order.update",
			"sales.order.post",
			"sales.order.cancel",
			"sales.order.read",
			"sales.order.list",
			"purchasing.order.create",
			"purchasing.order.update",
			"purchasing.order.post",
			"purchasing.order.cancel",
			"purchasing.order.close",
			"purchasing.order.read",
			"purchasing.order.list",
			"inventory.movement.create",
			"inventory.movement.post",
			"inventory.movement.cancel",
			"inventory.movement.read",
			"inventory.reservation.create",
			"inventory.reservation.release",
			"inventory.availability.read",
			"inventory.adjustment.post",
			"receiving.receipt.read",
			"receiving.receipt.create",
			"receiving.receipt.update",
			"receiving.receipt.post",
			"receiving.receipt.cancel",
			"receiving.receipt.reverse",
			"receiving.discrepancy.record",
			"receiving.discrepancy.resolve",
			"fulfillment.delivery.read",
			"fulfillment.delivery.create",
			"fulfillment.delivery.update",
			"fulfillment.picking.confirm",
			"fulfillment.packing.confirm",
			"fulfillment.delivery.post",
			"fulfillment.delivery.cancel",
			"fulfillment.pod.record",
			"fulfillment.delivery.close",
			"receivables.invoice.read",
			"receivables.invoice.create",
			"receivables.invoice.update",
			"receivables.invoice.post",
			"receivables.invoice.cancel",
			"receivables.invoice.close",
			"receivables.credit_note.issue",
			"receivables.receipt.apply",
			"receivables.receipt_application.reverse",
			"receivables.balance.read",
			"receivables.aging.read",
			"payables.read",
			"payables.manage",
			"payments.payment.read",
			"payments.payment.create",
			"payments.payment.update",
			"payments.payment.post",
			"payments.payment.reverse",
			"payments.refund.create",
			"payments.refund.post",
			"payments.transfer.create",
			"payments.transfer.post",
			"payments.application_instruction.manage",
			"payments.account.manage",
			"payments.account.read",
			"payments.availability.read",
			"accounting.journal.read",
			"accounting.journal.create",
			"accounting.journal.update",
			"accounting.journal.post",
			"accounting.journal.reverse",
			"accounting.trial_balance.read",
			"accounting.ledger.read",
			"accounting.period.read",
			"accounting.period.open",
			"accounting.period.soft_close",
			"accounting.period.close",
			"accounting.period.reopen",
			"accounting.account.read",
			"accounting.account.manage",
			"accounting.posting_rule.manage",
			"accounting.exception.read",
			"accounting.exception.manage",
		],
	},
	{
		templateKey: "viewer",
		name: "Viewer",
		description:
			"Account self + master-data and operational module read access",
		permissionCodes: [
			"account.self",
			"master_data.read",
			"sales.order.read",
			"sales.order.list",
			"purchasing.order.read",
			"purchasing.order.list",
			"inventory.movement.read",
			"inventory.availability.read",
			"receiving.receipt.read",
			"fulfillment.delivery.read",
			"receivables.invoice.read",
			"receivables.balance.read",
			"receivables.aging.read",
			"payables.read",
			"payments.payment.read",
			"payments.account.read",
			"payments.availability.read",
			"accounting.journal.read",
			"accounting.trial_balance.read",
			"accounting.ledger.read",
			"accounting.period.read",
			"accounting.account.read",
			"accounting.exception.read",
		],
	},
] as const;

export type EnsurePlatformPermissionCatalogResult = {
	permissionCount: number;
	templates: ReadonlyArray<{
		templateKey: string;
		roleId: string;
		created: boolean;
	}>;
};

/**
 * Idempotent upsert of ARCH-023 v1 `platform_permission` rows and the three
 * system role templates (`org_admin` · `editor` · `viewer`) with exact
 * `platform_role_permission` links. Preserves existing template UUIDs when
 * `template_key` already exists. Removes retired domain permission codes.
 */
export async function ensurePlatformPermissionCatalog(
	database: Database,
): Promise<EnsurePlatformPermissionCatalogResult> {
	for (const row of PLATFORM_PERMISSION_V1) {
		await database
			.insert(platformPermission)
			.values({
				code: row.code,
				module: row.module,
				description: row.description,
				sensitive: row.sensitive,
			})
			.onConflictDoUpdate({
				target: platformPermission.code,
				set: {
					module: row.module,
					description: row.description,
					sensitive: row.sensitive,
				},
			});
	}

	await database
		.delete(platformRolePermission)
		.where(
			inArray(platformRolePermission.permissionCode, [
				...RETIRED_PLATFORM_PERMISSION_CODES,
			]),
		);
	await database
		.delete(platformPermission)
		.where(
			inArray(platformPermission.code, [...RETIRED_PLATFORM_PERMISSION_CODES]),
		);

	const templates: Array<{
		templateKey: string;
		roleId: string;
		created: boolean;
	}> = [];

	for (const template of PLATFORM_ROLE_TEMPLATES_V1) {
		const [existing] = await database
			.select({ id: platformRole.id })
			.from(platformRole)
			.where(
				and(
					eq(platformRole.templateKey, template.templateKey),
					eq(platformRole.isSystemTemplate, true),
					isNull(platformRole.organizationId),
				),
			)
			.limit(1);

		let roleId: string;
		let created = false;

		if (existing) {
			roleId = existing.id;
			await database
				.update(platformRole)
				.set({
					name: template.name,
					description: template.description,
					active: true,
					isSystemTemplate: true,
					updatedAt: new Date(),
				})
				.where(eq(platformRole.id, roleId));
		} else {
			const [inserted] = await database
				.insert(platformRole)
				.values({
					organizationId: null,
					name: template.name,
					description: template.description,
					active: true,
					isSystemTemplate: true,
					templateKey: template.templateKey,
				})
				.returning({ id: platformRole.id });
			if (!inserted) {
				throw new Error(
					`ensurePlatformPermissionCatalog failed to insert template ${template.templateKey}`,
				);
			}
			roleId = inserted.id;
			created = true;
		}

		const codes = [...template.permissionCodes];

		if (codes.length > 0) {
			await database
				.insert(platformRolePermission)
				.values(
					codes.map((permissionCode) => ({
						roleId,
						permissionCode,
					})),
				)
				.onConflictDoNothing();

			await database
				.delete(platformRolePermission)
				.where(
					and(
						eq(platformRolePermission.roleId, roleId),
						notInArray(platformRolePermission.permissionCode, codes),
					),
				);
		} else {
			await database
				.delete(platformRolePermission)
				.where(eq(platformRolePermission.roleId, roleId));
		}

		templates.push({
			templateKey: template.templateKey,
			roleId,
			created,
		});
	}

	const permissionRows = await database
		.select({ code: platformPermission.code })
		.from(platformPermission)
		.where(inArray(platformPermission.code, [...PLATFORM_PERMISSION_CODES_V1]));

	return {
		permissionCount: permissionRows.length,
		templates,
	};
}
