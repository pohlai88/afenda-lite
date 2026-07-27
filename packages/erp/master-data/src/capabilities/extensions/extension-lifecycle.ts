import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterPermission } from "../../authorization";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MASTER_DATA_PERMISSION_ITEM_ALIAS_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_BARCODE_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_EXTERNAL_ID_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_TEMPLATE_ATTRIBUTE_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_TEMPLATE_OPTION_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_UOM_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_ATTRIBUTE_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_ADDRESS_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_ROLE_MANAGE,
	MASTER_DATA_PERMISSION_WAREHOUSE_EXTERNAL_ID_MANAGE,
} from "../../permissions";
import type { ExtensionKind } from "./extension-policies";

export const MAX_EXTENSION_TRANSITION_REASON_LENGTH = 1_000;

export const STANDARD_CHILD_LIFECYCLE_STATUSES = [
	"draft",
	"active",
	"inactive",
	"retired",
	"archived",
] as const;
export type StandardChildLifecycleStatus =
	(typeof STANDARD_CHILD_LIFECYCLE_STATUSES)[number];

export const IDENTITY_REGISTRATION_LIFECYCLE_STATUSES = [
	"pending",
	"active",
	"expired",
	"revoked",
	"archived",
] as const;
export type IdentityRegistrationLifecycleStatus =
	(typeof IDENTITY_REGISTRATION_LIFECYCLE_STATUSES)[number];

export const RELATIONSHIP_LIFECYCLE_STATUSES = [
	"draft",
	"active",
	"inactive",
	"terminated",
	"archived",
] as const;
export type RelationshipLifecycleStatus =
	(typeof RELATIONSHIP_LIFECYCLE_STATUSES)[number];

export type ExtensionLifecycleFamily =
	| "standard_child"
	| "identity_registration"
	| "relationship";

export type ExtensionLifecycleStatusByFamily = {
	standard_child: StandardChildLifecycleStatus;
	identity_registration: IdentityRegistrationLifecycleStatus;
	relationship: RelationshipLifecycleStatus;
};

export type ExtensionLifecycleStatus =
	ExtensionLifecycleStatusByFamily[ExtensionLifecycleFamily];

export type ExtensionParentStateRequirement =
	| "parent_exists"
	| "parent_not_retired"
	| "parent_active";

export type ExtensionDependencyBehavior = "allow" | "block_when_referenced";

export type ExtensionTransitionInitiator = "operator" | "system";

export type ExtensionEventAction =
	| "activated"
	| "inactivated"
	| "expired"
	| "revoked"
	| "terminated"
	| "retired"
	| "archived";

export type ExtensionLifecycleTransition<
	Family extends ExtensionLifecycleFamily = ExtensionLifecycleFamily,
> = Readonly<{
	from: ExtensionLifecycleStatusByFamily[Family];
	to: ExtensionLifecycleStatusByFamily[Family];
	reasonRequired: boolean;
	expectedVersionRequired: true;
	parentStateRequirement: ExtensionParentStateRequirement;
	dependencyBehavior: ExtensionDependencyBehavior;
	allowedInitiators: readonly ExtensionTransitionInitiator[];
	emittedEventAction: ExtensionEventAction;
	auditAction: "UPDATE";
}>;

function transition<Family extends ExtensionLifecycleFamily>(
	input: Omit<
		ExtensionLifecycleTransition<Family>,
		"expectedVersionRequired" | "auditAction"
	>,
): ExtensionLifecycleTransition<Family> {
	return {
		...input,
		expectedVersionRequired: true,
		auditAction: "UPDATE",
	};
}

export const EXTENSION_LIFECYCLE_TRANSITIONS = {
	standard_child: [
		transition<"standard_child">({
			from: "draft",
			to: "active",
			reasonRequired: false,
			parentStateRequirement: "parent_not_retired",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "activated",
		}),
		transition<"standard_child">({
			from: "active",
			to: "inactive",
			reasonRequired: true,
			parentStateRequirement: "parent_not_retired",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "inactivated",
		}),
		transition<"standard_child">({
			from: "inactive",
			to: "active",
			reasonRequired: false,
			parentStateRequirement: "parent_not_retired",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "activated",
		}),
		transition<"standard_child">({
			from: "active",
			to: "retired",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "retired",
		}),
		transition<"standard_child">({
			from: "inactive",
			to: "retired",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "retired",
		}),
		transition<"standard_child">({
			from: "retired",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
		transition<"standard_child">({
			from: "draft",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
		transition<"standard_child">({
			from: "inactive",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
		transition<"standard_child">({
			from: "active",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
	] satisfies readonly ExtensionLifecycleTransition<"standard_child">[],
	identity_registration: [
		transition<"identity_registration">({
			from: "pending",
			to: "active",
			reasonRequired: false,
			parentStateRequirement: "parent_active",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "activated",
		}),
		transition<"identity_registration">({
			from: "active",
			to: "expired",
			reasonRequired: false,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator", "system"],
			emittedEventAction: "expired",
		}),
		transition<"identity_registration">({
			from: "pending",
			to: "revoked",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "revoked",
		}),
		transition<"identity_registration">({
			from: "active",
			to: "revoked",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "revoked",
		}),
		transition<"identity_registration">({
			from: "expired",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
		transition<"identity_registration">({
			from: "revoked",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
	] satisfies readonly ExtensionLifecycleTransition<"identity_registration">[],
	relationship: [
		transition<"relationship">({
			from: "draft",
			to: "active",
			reasonRequired: false,
			parentStateRequirement: "parent_active",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "activated",
		}),
		transition<"relationship">({
			from: "active",
			to: "inactive",
			reasonRequired: true,
			parentStateRequirement: "parent_not_retired",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "inactivated",
		}),
		transition<"relationship">({
			from: "inactive",
			to: "active",
			reasonRequired: false,
			parentStateRequirement: "parent_active",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "activated",
		}),
		transition<"relationship">({
			from: "active",
			to: "terminated",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "terminated",
		}),
		transition<"relationship">({
			from: "inactive",
			to: "terminated",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "block_when_referenced",
			allowedInitiators: ["operator"],
			emittedEventAction: "terminated",
		}),
		transition<"relationship">({
			from: "draft",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
		transition<"relationship">({
			from: "terminated",
			to: "archived",
			reasonRequired: true,
			parentStateRequirement: "parent_exists",
			dependencyBehavior: "allow",
			allowedInitiators: ["operator"],
			emittedEventAction: "archived",
		}),
	] satisfies readonly ExtensionLifecycleTransition<"relationship">[],
} as const satisfies {
	[Family in ExtensionLifecycleFamily]: readonly ExtensionLifecycleTransition<Family>[];
};

export const EXTENSION_LIFECYCLE_FAMILY_BY_KIND = {
	party_role: "standard_child",
	party_address: "standard_child",
	party_contact: "standard_child",
	party_external_id: "identity_registration",
	party_relationship: "relationship",
	item_uom: "standard_child",
	item_barcode: "identity_registration",
	item_external_id: "identity_registration",
	item_alias: "standard_child",
	warehouse_external_id: "identity_registration",
	item_template_attribute: "standard_child",
	item_template_attribute_option: "standard_child",
	item_variant_attribute_value: "standard_child",
} as const satisfies Record<ExtensionKind, ExtensionLifecycleFamily>;

export const EXTENSION_LIFECYCLE_PERMISSION_BY_KIND = {
	party_role: MASTER_DATA_PERMISSION_PARTY_ROLE_MANAGE,
	party_address: MASTER_DATA_PERMISSION_PARTY_ADDRESS_MANAGE,
	party_contact: MASTER_DATA_PERMISSION_PARTY_CONTACT_MANAGE,
	party_external_id: MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_MANAGE,
	party_relationship: MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_MANAGE,
	item_uom: MASTER_DATA_PERMISSION_ITEM_UOM_MANAGE,
	item_barcode: MASTER_DATA_PERMISSION_ITEM_BARCODE_MANAGE,
	item_external_id: MASTER_DATA_PERMISSION_ITEM_EXTERNAL_ID_MANAGE,
	item_alias: MASTER_DATA_PERMISSION_ITEM_ALIAS_MANAGE,
	warehouse_external_id: MASTER_DATA_PERMISSION_WAREHOUSE_EXTERNAL_ID_MANAGE,
	item_template_attribute:
		MASTER_DATA_PERMISSION_ITEM_TEMPLATE_ATTRIBUTE_MANAGE,
	item_template_attribute_option:
		MASTER_DATA_PERMISSION_ITEM_TEMPLATE_OPTION_MANAGE,
	item_variant_attribute_value:
		MASTER_DATA_PERMISSION_ITEM_VARIANT_ATTRIBUTE_MANAGE,
} as const satisfies Record<ExtensionKind, MasterPermission>;

export type ResolvedExtensionLifecycleTransition<
	Family extends ExtensionLifecycleFamily = ExtensionLifecycleFamily,
> = ExtensionLifecycleTransition<Family> &
	Readonly<{
		requiredPermission: MasterPermission;
	}>;

export function resolveExtensionLifecycleTransition<
	const Kind extends ExtensionKind,
	const Family extends (typeof EXTENSION_LIFECYCLE_FAMILY_BY_KIND)[Kind],
>(
	kind: Kind,
	from: ExtensionLifecycleStatusByFamily[Family],
	to: ExtensionLifecycleStatusByFamily[Family],
): Result<ResolvedExtensionLifecycleTransition<Family>> {
	const family = EXTENSION_LIFECYCLE_FAMILY_BY_KIND[kind] as Family;
	const candidates = EXTENSION_LIFECYCLE_TRANSITIONS[
		family
	] as readonly ExtensionLifecycleTransition<Family>[];
	const found = candidates.find(
		(candidate) => candidate.from === from && candidate.to === to,
	);
	if (found === undefined) {
		return fail("CONFLICT", `Invalid ${family} lifecycle transition`, {
			reason: "MASTER_INVALID_STATE",
			extensionKind: kind,
			fromStatus: from,
			toStatus: to,
		} satisfies MasterFailureDetails);
	}
	return ok({
		...found,
		requiredPermission: EXTENSION_LIFECYCLE_PERMISSION_BY_KIND[kind],
	});
}

export function assertExtensionTransitionReason(
	transitionPolicy:
		| ExtensionLifecycleTransition
		| ResolvedExtensionLifecycleTransition,
	reason: string | null | undefined,
): Result<string | null> {
	const normalized = reason?.normalize("NFC").trim() ?? "";
	if (transitionPolicy.reasonRequired && normalized.length === 0) {
		return fail("BAD_REQUEST", "A lifecycle transition reason is required", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "reason",
		} satisfies MasterFailureDetails);
	}
	if (normalized.length > MAX_EXTENSION_TRANSITION_REASON_LENGTH) {
		return fail(
			"BAD_REQUEST",
			`Lifecycle transition reason must not exceed ${MAX_EXTENSION_TRANSITION_REASON_LENGTH} characters`,
			{
				reason: "MASTER_VALIDATION_FAILED",
				field: "reason",
			} satisfies MasterFailureDetails,
		);
	}
	return ok(normalized.length === 0 ? null : normalized);
}

const STANDARD_CHILD_LIFECYCLE_STATUS_SET: ReadonlySet<string> = new Set(
	STANDARD_CHILD_LIFECYCLE_STATUSES,
);

export function isStandardChildLifecycleStatus(
	value: string,
): value is StandardChildLifecycleStatus {
	return STANDARD_CHILD_LIFECYCLE_STATUS_SET.has(value);
}

export function parseStandardChildLifecycleStatus(
	value: string,
): Result<StandardChildLifecycleStatus> {
	if (!isStandardChildLifecycleStatus(value)) {
		return fail("BAD_REQUEST", "Standard child lifecycle status is invalid", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "status",
		} satisfies MasterFailureDetails);
	}
	return ok(value);
}

export function assertStandardChildLifecycleStatus(
	value: string,
): StandardChildLifecycleStatus {
	const parsed = parseStandardChildLifecycleStatus(value);
	if (!parsed.ok) {
		throw new RangeError(`Invalid standard child lifecycle status: ${value}`);
	}
	return parsed.data;
}
