/**
 * ARCH-023 §3.2 — platform permission catalog v1 + system role templates.
 *
 * Adding a code is a release. Living platform and ERP domain rows are grouped
 * under `platform-permission-catalog/`; retired declarations/FFT codes remain
 * absent.
 */
import type { Database } from "./client";
import { CORPORATE_ADMINISTRATION_PLATFORM_PERMISSIONS } from "./platform-permission-catalog/corporate-administration";
import { ERP_PLATFORM_PERMISSIONS } from "./platform-permission-catalog/erp";
import { FOUNDATION_PLATFORM_PERMISSIONS } from "./platform-permission-catalog/foundation";
import { MASTER_DATA_PLATFORM_PERMISSIONS } from "./platform-permission-catalog/master-data";
import { WORKFORCE_PLATFORM_PERMISSIONS } from "./platform-permission-catalog/workforce";
import {
	buildPlatformPermissionCatalogBatch as buildCatalogBatch,
	reconcilePlatformPermissionCatalog,
} from "./platform-permission-catalog-reconciler";

const RETIRED_CORPORATE_ADMINISTRATION_PERMISSION_V1 = [
	["corporate_administration.access", "Access Corporate Administration", false],
	[
		"corporate_administration.company.activate",
		"Activate legal companies",
		true,
	],
	[
		"corporate_administration.company.dissolve",
		"Dissolve legal companies",
		true,
	],
	[
		"corporate_administration.authority.read",
		"Read corporate authority policies",
		false,
	],
	[
		"corporate_administration.authority.manage",
		"Manage corporate authority policies",
		true,
	],
	[
		"corporate_administration.authority.publish",
		"Publish corporate authority policies",
		true,
	],
	["corporate_administration.seal.manage", "Manage corporate seals", true],
	[
		"corporate_administration.capital.read",
		"Read share capital records",
		false,
	],
	[
		"corporate_administration.capital.configure",
		"Configure share capital structures",
		true,
	],
	["corporate_administration.capital.post", "Post capital transactions", true],
	[
		"corporate_administration.capital.reverse",
		"Reverse capital transactions",
		true,
	],
	[
		"corporate_administration.ownership.read",
		"Read legal ownership records",
		false,
	],
	[
		"corporate_administration.ownership.manage",
		"Manage legal ownership records",
		true,
	],
	[
		"corporate_administration.ubo.read",
		"Read beneficial ownership records",
		true,
	],
	[
		"corporate_administration.ubo.manage",
		"Manage beneficial ownership records",
		true,
	],
	[
		"corporate_administration.ubo.attest",
		"Attest beneficial ownership records",
		true,
	],
	[
		"corporate_administration.distribution.declare",
		"Declare corporate distributions",
		true,
	],
	[
		"corporate_administration.assets.read",
		"Read corporate asset records",
		false,
	],
	[
		"corporate_administration.assets.manage",
		"Manage corporate asset records",
		true,
	],
	[
		"corporate_administration.licence.manage",
		"Manage corporate licences",
		true,
	],
	["corporate_administration.charge.manage", "Manage corporate charges", true],
	[
		"corporate_administration.banking.read",
		"Read corporate banking references",
		true,
	],
	[
		"corporate_administration.banking.manage",
		"Manage corporate banking references",
		true,
	],
	[
		"corporate_administration.bank_mandate.manage",
		"Manage corporate bank mandates",
		true,
	],
	[
		"corporate_administration.group.read",
		"Read corporate group structures",
		false,
	],
	[
		"corporate_administration.group.manage",
		"Manage corporate group structures",
		true,
	],
	[
		"corporate_administration.related_party.manage",
		"Manage related-party relationships",
		true,
	],
	[
		"corporate_administration.agreement.manage",
		"Manage corporate agreements",
		true,
	],
	[
		"corporate_administration.corporate_action.manage",
		"Manage corporate actions",
		true,
	],
	[
		"corporate_administration.corporate_action.approve_effect",
		"Approve corporate action effects",
		true,
	],
	[
		"corporate_administration.document.read",
		"Read corporate document metadata",
		true,
	],
	[
		"corporate_administration.document.manage",
		"Manage corporate document references",
		true,
	],
	[
		"corporate_administration.register.certify",
		"Certify corporate registers",
		true,
	],
	[
		"corporate_administration.compliance_rule.manage",
		"Manage corporate compliance rules",
		true,
	],
	[
		"corporate_administration.filing.read",
		"Read corporate filing records",
		false,
	],
	["corporate_administration.filing.manage", "Manage corporate filings", true],
	[
		"corporate_administration.filing.waive",
		"Waive corporate filing requirements",
		true,
	],
	[
		"corporate_administration.import.prepare",
		"Prepare Corporate Administration imports",
		true,
	],
	[
		"corporate_administration.import.approve",
		"Approve Corporate Administration imports",
		true,
	],
	[
		"corporate_administration.import.apply",
		"Apply approved Corporate Administration imports",
		true,
	],
	[
		"corporate_administration.export",
		"Export Corporate Administration records",
		false,
	],
	[
		"corporate_administration.reconcile",
		"Reconcile Corporate Administration records",
		true,
	],
	[
		"corporate_administration.sensitive_export",
		"Export sensitive Corporate Administration records",
		true,
	],
	[
		"corporate_administration.module_admin",
		"Administer the Corporate Administration module",
		true,
	],
] as const;

/** Seed permission codes (v1) — ARCH-023 §3.2 (shell after domain wipe). */
export const PLATFORM_PERMISSION_V1 = [
	...FOUNDATION_PLATFORM_PERMISSIONS,
	...MASTER_DATA_PLATFORM_PERMISSIONS,
	...CORPORATE_ADMINISTRATION_PLATFORM_PERMISSIONS,
	...ERP_PLATFORM_PERMISSIONS,
	...WORKFORCE_PLATFORM_PERMISSIONS,
] as const;

/**
 * Retired v1 codes removed by the domain wipe / S15 cutover or fine-grained
 * split — deleted on ensure.
 *
 * HR-TIME-P0-08: `human-resources.timesheet.approve` →
 * `human-resources.time.timesheet.approve` (role grants copied before delete).
 */
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
	"human-resources.timesheet.approve",
	"master_data.tax_registration_number_read",
	"master_data.personal_contact_read",
	...RETIRED_CORPORATE_ADMINISTRATION_PERMISSION_V1.map(([code]) => code),
	"corporate-administration.company.update",
	"corporate-administration.company.activate",
	"corporate-administration.company.suspend",
	"corporate-administration.company.dissolve",
	"corporate-administration.company.archive",
	"corporate-administration.company-name.manage",
	"corporate-administration.company-identifier.manage",
	"corporate-administration.governance.manage",
	"corporate-administration.governance.read",
	"corporate-administration.share-capital.manage",
	"corporate-administration.share-capital.read",
	"corporate-administration.property-assets.manage",
	"corporate-administration.property-assets.read",
	"corporate-administration.licences-banking.manage",
	"corporate-administration.licences-banking.read",
	"corporate-administration.documents-filings.manage",
	"corporate-administration.documents-filings.read",
	"corporate-administration.compliance.read",
] as const;

const MASTER_DATA_PERMISSION_GRANT_MIGRATIONS = [
	{
		from: "master_data.party_read",
		to: ["master_data.tax_registration_read", "master_data.party_contact_read"],
	},
	{
		from: "master_data.tax_registration_number_read",
		to: ["master_data.tax_registration_sensitive_read"],
	},
	{
		from: "master_data.personal_contact_read",
		to: ["master_data.party_contact_sensitive_read"],
	},
] as const;

/** HR-TIME-P0-08 seed migration: legacy permission → successor. */
const LEGACY_TIMESHEET_APPROVE_PERMISSION =
	"human-resources.timesheet.approve" as const;
const TIME_TIMESHEET_APPROVE_PERMISSION =
	"human-resources.time.timesheet.approve" as const;

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

export interface PlatformRoleTemplateV1 {
	description: string;
	name: string;
	permissionCodes: readonly PlatformPermissionCodeV1[];
	templateKey: string;
}

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
			"Org invite + routine master-data management + account self (no MDG/import or elevated extension authority)",
		permissionCodes: [
			"clients.invite",
			"account.self",
			"master_data.reference_read",
			"master_data.dimension_read",
			"master_data.dimension_create",
			"master_data.dimension_update",
			"master_data.dimension_activate",
			"master_data.dimension_archive",
			"master_data.party_read",
			"master_data.tax_registration_read",
			"master_data.party_contact_read",
			"master_data.party_create",
			"master_data.party_update",
			"master_data.party_activate",
			"master_data.party_suspend",
			"master_data.party_archive",
			"master_data.item_read",
			"master_data.item_create",
			"master_data.item_update",
			"master_data.item_activate",
			"master_data.item_suspend",
			"master_data.item_archive",
			"master_data.item_extension_manage",
			"master_data.warehouse_manage",
			"master_data.warehouse_read",
			"master_data.payment_term_manage",
			"master_data.payment_term_read",
			"master_data.tax_registration_manage",
			"master_data.template_manage",
			"master_data.variant_manage",
			"master_data.change_request_read",
			"master_data.search_read",
			"master_data.party_role_manage",
			"master_data.party_address_manage",
			"master_data.party_contact_manage",
			"master_data.party_external_id_manage",
			"master_data.party_relationship_manage",
			"master_data.item_uom_manage",
			"master_data.item_barcode_manage",
			"master_data.item_external_id_manage",
			"master_data.item_alias_manage",
			"master_data.warehouse_external_id_manage",
			"master_data.item_template_attribute_manage",
			"master_data.item_template_option_manage",
			"master_data.item_variant_attribute_manage",
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
			"master_data.reference_read",
			"master_data.dimension_read",
			"master_data.party_read",
			"master_data.tax_registration_read",
			"master_data.party_contact_read",
			"master_data.item_read",
			"master_data.warehouse_read",
			"master_data.payment_term_read",
			"master_data.change_request_read",
			"master_data.search_read",
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

export interface EnsurePlatformPermissionCatalogResult {
	permissionCount: number;
	templates: ReadonlyArray<{
		templateKey: string;
		roleId: string;
		created: boolean;
	}>;
}

const PLATFORM_PERMISSION_GRANT_MIGRATIONS = [
	...MASTER_DATA_PERMISSION_GRANT_MIGRATIONS,
	{
		from: LEGACY_TIMESHEET_APPROVE_PERMISSION,
		to: [TIME_TIMESHEET_APPROVE_PERMISSION],
	},
] as const;

const PLATFORM_PERMISSION_RECONCILIATION_INPUT = {
	grantMigrations: PLATFORM_PERMISSION_GRANT_MIGRATIONS,
	permissions: PLATFORM_PERMISSION_V1,
	retiredPermissionCodes: RETIRED_PLATFORM_PERMISSION_CODES,
	roleTemplates: PLATFORM_ROLE_TEMPLATES_V1,
} as const;

/** Build the bounded Neon batch used by the release catalog reconciliation. */
export function buildPlatformPermissionCatalogBatch(database: Database) {
	return buildCatalogBatch(database, PLATFORM_PERMISSION_RECONCILIATION_INPUT);
}

/**
 * Atomically reconcile permissions, grant migrations, retirements, and the
 * exact three system role templates through one Neon HTTP transaction batch.
 */
export function ensurePlatformPermissionCatalog(
	database: Database,
): Promise<EnsurePlatformPermissionCatalogResult> {
	return reconcilePlatformPermissionCatalog(
		database,
		PLATFORM_PERMISSION_RECONCILIATION_INPUT,
	);
}
