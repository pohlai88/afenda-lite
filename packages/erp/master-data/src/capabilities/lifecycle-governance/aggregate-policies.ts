import { defineLifecyclePolicy } from "./lifecycle-policy";
import type {
	EffectiveDatedState,
	LifecycleFamily,
	LifecycleTransitionDocumentation,
	OperationalMasterState,
	SimpleMasterState,
} from "./types";

const rootActivationDocumentation = {
	requiredParentState: null,
	requiredChildEvidence: ["aggregate_activation_requirements"],
	effectiveDateBehavior:
		"No effective-date change; activation validates current effective prerequisites where the aggregate owns them.",
	canonicalIdentityBehavior:
		"Record must be canonical and not merged into another identity.",
	searchProjectionConsequence:
		"Add or refresh the operational search projection.",
	permitsNewTransactionalUse: true,
} as const satisfies LifecycleTransitionDocumentation;

const partyActivationDocumentation = {
	...rootActivationDocumentation,
	requiredChildEvidence: [
		"required_fields_complete",
		"valid_normalized_code",
		"no_uniqueness_conflict",
		"active_party_role",
		"not_merged",
	],
} as const satisfies LifecycleTransitionDocumentation;

const itemActivationDocumentation = {
	...rootActivationDocumentation,
	requiredChildEvidence: [
		"required_fields_complete",
		"valid_normalized_code",
		"no_uniqueness_conflict",
		"active_item_group",
		"active_base_uom",
	],
} as const satisfies LifecycleTransitionDocumentation;

const warehouseActivationDocumentation = {
	...rootActivationDocumentation,
	requiredChildEvidence: [
		"required_fields_complete",
		"valid_normalized_code",
		"valid_organization_scope",
		"required_location_data",
		"active_parent_when_nested",
	],
} as const satisfies LifecycleTransitionDocumentation;

const templateActivationDocumentation = {
	...rootActivationDocumentation,
	requiredChildEvidence: [
		"required_fields_complete",
		"valid_normalized_code",
		"template_attribute_configuration_valid",
	],
} as const satisfies LifecycleTransitionDocumentation;

const variantActivationDocumentation = {
	...rootActivationDocumentation,
	requiredChildEvidence: [
		"required_fields_complete",
		"valid_normalized_code",
		"active_template",
		"complete_required_attributes",
		"active_item_group",
		"active_base_uom",
	],
} as const satisfies LifecycleTransitionDocumentation;

const rootInactivationDocumentation = {
	requiredParentState: null,
	requiredChildEvidence: [],
	effectiveDateBehavior: "No effective-date change.",
	canonicalIdentityBehavior:
		"Exact historical identity remains resolvable; canonical target is unchanged.",
	searchProjectionConsequence:
		"Remove from operational selection or mark unavailable in search.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const rootBlockDocumentation = {
	requiredParentState: null,
	requiredChildEvidence: ["block_reason"],
	effectiveDateBehavior: "No effective-date change.",
	canonicalIdentityBehavior:
		"Exact historical identity remains resolvable; canonical target is unchanged.",
	searchProjectionConsequence:
		"Remove from operational selection and mark blocked in recoverable projections.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const rootUnblockToInactiveDocumentation = {
	requiredParentState: null,
	requiredChildEvidence: ["resolution_reason"],
	effectiveDateBehavior:
		"No effective-date change; activation requires a separate revalidation transition.",
	canonicalIdentityBehavior:
		"Exact historical identity remains resolvable; canonical target is unchanged.",
	searchProjectionConsequence:
		"Keep out of operational selection until reactivation.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const unblockToActiveDocumentation = {
	...rootActivationDocumentation,
	requiredChildEvidence: [
		"resolution_reason",
		"aggregate_activation_requirements",
	],
	searchProjectionConsequence:
		"Refresh the operational search projection after block resolution and activation revalidation.",
} as const satisfies LifecycleTransitionDocumentation;

const rootRetirementDocumentation = {
	requiredParentState: null,
	requiredChildEvidence: ["retirement_reason"],
	effectiveDateBehavior:
		"No effective-date change; dependent effective records remain historical evidence.",
	canonicalIdentityBehavior:
		"Exact historical identity remains resolvable and is not merged.",
	searchProjectionConsequence:
		"Remove from operational selection; optional historical search may remain.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const rootArchivalDocumentation = {
	requiredParentState: "not_active",
	requiredChildEvidence: ["archive_reason"],
	effectiveDateBehavior:
		"No effective-date change; archived records remain historically queryable.",
	canonicalIdentityBehavior:
		"Exact historical identity remains resolvable; canonical target is unchanged.",
	searchProjectionConsequence:
		"Remove from normal search and operational selection projections.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const mergeDocumentation = {
	requiredParentState: null,
	requiredChildEvidence: [
		"approved_merge_evidence",
		"conflict_resolution_decisions",
	],
	effectiveDateBehavior:
		"No effective-date change; source identity becomes terminal merge evidence.",
	canonicalIdentityBehavior:
		"Source resolves to canonical target; historical exact-ID lookup remains available.",
	searchProjectionConsequence:
		"Remove or redirect source projection to the canonical target.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const effectiveDatedActivationDocumentation = {
	requiredParentState: "active_parent",
	requiredChildEvidence: ["valid_effective_range", "activation_requirements"],
	effectiveDateBehavior:
		"Stored active status must be coherent with the effective range at the evaluated instant.",
	canonicalIdentityBehavior:
		"Parent identity must be canonical where the aggregate is parent-owned.",
	searchProjectionConsequence:
		"Refresh searchable projection only when the effective record is operationally available.",
	permitsNewTransactionalUse: true,
} as const satisfies LifecycleTransitionDocumentation;

const effectiveDatedRevocationDocumentation = {
	requiredParentState: "active_parent",
	requiredChildEvidence: ["revocation_reason"],
	effectiveDateBehavior:
		"Revocation terminates future effective availability without deleting history.",
	canonicalIdentityBehavior: "Parent identity remains historically resolvable.",
	searchProjectionConsequence:
		"Remove from operational selection projections; preserve historical evidence.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const childActivationDocumentation = {
	requiredParentState: "active",
	requiredChildEvidence: ["parent_is_usable", "child_activation_requirements"],
	effectiveDateBehavior:
		"No effective-date change unless the child aggregate owns an effective range.",
	canonicalIdentityBehavior:
		"Parent identity must be canonical where parent-owned.",
	searchProjectionConsequence:
		"Refresh parent or child projection according to aggregate search ownership.",
	permitsNewTransactionalUse: true,
} as const satisfies LifecycleTransitionDocumentation;

const childRetirementDocumentation = {
	requiredParentState: "active_or_inactive",
	requiredChildEvidence: ["retirement_reason"],
	effectiveDateBehavior:
		"No effective-date change; child remains historical evidence.",
	canonicalIdentityBehavior: "Parent identity remains historically resolvable.",
	searchProjectionConsequence:
		"Remove child from operational selection projections.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

export const AGGREGATE_LIFECYCLE_FAMILY_DECLARATIONS = {
	organization_dimension: "simple_master",
	party: "operational_master",
	item: "operational_master",
	warehouse: "operational_master",
	item_variant: "operational_master",
	item_group: "simple_master",
	payment_term: "simple_master",
	tax_registration: "effective_dated",
	party_role: "effective_dated",
	party_address: "effective_dated",
	party_contact: "effective_dated",
	party_external_id: "effective_dated",
	party_relationship: "effective_dated",
	item_template: "simple_master",
} as const satisfies Record<string, LifecycleFamily>;

export const partyLifecyclePolicy =
	defineLifecyclePolicy<OperationalMasterState>({
		family: "operational_master",
		entityType: "party",
		transitions: {
			activate: {
				...partyActivationDocumentation,
				operation: "activateParty",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.party_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.party.activated",
				reversible: true,
			},
			inactivate: {
				...rootInactivationDocumentation,
				operation: "inactivateParty",
				from: ["active"],
				to: "inactive",
				requiredPermission: "master_data.party_inactivate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.party.inactivated",
				reversible: true,
			},
			block: {
				...rootBlockDocumentation,
				operation: "blockParty",
				from: ["active", "inactive"],
				to: "blocked",
				requiredPermission: "master_data.party_block",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.party.blocked",
				reversible: true,
			},
			unblock_to_inactive: {
				...rootUnblockToInactiveDocumentation,
				operation: "unblockPartyToInactive",
				from: ["blocked"],
				to: "inactive",
				requiredPermission: "master_data.party_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.party.unblocked_to_inactive",
				reversible: true,
			},
			unblock_to_active: {
				...unblockToActiveDocumentation,
				requiredChildEvidence: [
					"resolution_reason",
					...partyActivationDocumentation.requiredChildEvidence,
				],
				operation: "unblockPartyToActive",
				from: ["blocked"],
				to: "active",
				requiredPermission: "master_data.party_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.party.unblocked_to_active",
				reversible: true,
			},
			retire: {
				...rootRetirementDocumentation,
				operation: "retireParty",
				from: ["active", "inactive", "blocked"],
				to: "retired",
				requiredPermission: "master_data.party_retire",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				dependencyPolicy: "OPEN_OPERATIONAL_REFERENCES",
				eventType: "master_data.party.retired",
				reversible: false,
			},
			archive: {
				...rootArchivalDocumentation,
				operation: "archiveParty",
				from: ["draft", "inactive", "blocked", "retired"],
				to: "archived",
				requiredPermission: "master_data.party_archive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.party.archived",
				reversible: false,
			},
			merge: {
				...mergeDocumentation,
				operation: "mergeParties",
				from: ["active", "inactive", "blocked"],
				to: "merged",
				requiredPermission: "master_data.party_merge",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.party.merged",
				reversible: false,
			},
		},
	});

export const itemLifecyclePolicy =
	defineLifecyclePolicy<OperationalMasterState>({
		family: "operational_master",
		entityType: "item",
		transitions: {
			activate: {
				...itemActivationDocumentation,
				operation: "activateItem",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.item_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.item.activated",
				reversible: true,
			},
			inactivate: {
				...rootInactivationDocumentation,
				operation: "inactivateItem",
				from: ["active"],
				to: "inactive",
				requiredPermission: "master_data.item_inactivate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.item.inactivated",
				reversible: true,
			},
			block: {
				...rootBlockDocumentation,
				operation: "blockItem",
				from: ["active", "inactive"],
				to: "blocked",
				requiredPermission: "master_data.item_block",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item.blocked",
				reversible: true,
			},
			unblock_to_inactive: {
				...rootUnblockToInactiveDocumentation,
				operation: "unblockItemToInactive",
				from: ["blocked"],
				to: "inactive",
				requiredPermission: "master_data.item_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item.unblocked_to_inactive",
				reversible: true,
			},
			unblock_to_active: {
				...unblockToActiveDocumentation,
				requiredChildEvidence: [
					"resolution_reason",
					...itemActivationDocumentation.requiredChildEvidence,
				],
				operation: "unblockItemToActive",
				from: ["blocked"],
				to: "active",
				requiredPermission: "master_data.item_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item.unblocked_to_active",
				reversible: true,
			},
			retire: {
				...rootRetirementDocumentation,
				operation: "retireItem",
				from: ["active", "inactive", "blocked"],
				to: "retired",
				requiredPermission: "master_data.item_retire",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				dependencyPolicy: "OPEN_OPERATIONAL_REFERENCES",
				eventType: "master_data.item.retired",
				reversible: false,
			},
			archive: {
				...rootArchivalDocumentation,
				operation: "archiveItem",
				from: ["draft", "inactive", "blocked", "retired"],
				to: "archived",
				requiredPermission: "master_data.item_archive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item.archived",
				reversible: false,
			},
		},
	});

export const itemGroupLifecyclePolicy =
	defineLifecyclePolicy<SimpleMasterState>({
		family: "simple_master",
		entityType: "item_group",
		transitions: {
			activate: {
				...childActivationDocumentation,
				operation: "activateItemGroup",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.item_group_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.item_group.activated",
				reversible: true,
			},
			inactivate: {
				...rootInactivationDocumentation,
				operation: "inactivateItemGroup",
				from: ["active"],
				to: "inactive",
				requiredPermission: "master_data.item_group_inactivate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.item_group.inactivated",
				reversible: true,
			},
			archive: {
				...rootArchivalDocumentation,
				operation: "archiveItemGroup",
				from: ["draft", "inactive"],
				to: "archived",
				requiredPermission: "master_data.item_group_archive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				dependencyPolicy: "ACTIVE_CHILDREN",
				eventType: "master_data.item_group.archived",
				reversible: false,
			},
		},
	});

export const warehouseLifecyclePolicy =
	defineLifecyclePolicy<OperationalMasterState>({
		family: "operational_master",
		entityType: "warehouse",
		transitions: {
			activate: {
				...warehouseActivationDocumentation,
				operation: "activateWarehouse",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.warehouse_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.warehouse.activated",
				reversible: true,
			},
			inactivate: {
				...rootInactivationDocumentation,
				operation: "inactivateWarehouse",
				from: ["active"],
				to: "inactive",
				requiredPermission: "master_data.warehouse_inactivate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.warehouse.inactivated",
				reversible: true,
			},
			block: {
				...rootBlockDocumentation,
				operation: "blockWarehouse",
				from: ["active", "inactive"],
				to: "blocked",
				requiredPermission: "master_data.warehouse_block",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.warehouse.blocked",
				reversible: true,
			},
			unblock_to_inactive: {
				...rootUnblockToInactiveDocumentation,
				operation: "unblockWarehouseToInactive",
				from: ["blocked"],
				to: "inactive",
				requiredPermission: "master_data.warehouse_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.warehouse.unblocked_to_inactive",
				reversible: true,
			},
			unblock_to_active: {
				...unblockToActiveDocumentation,
				requiredChildEvidence: [
					"resolution_reason",
					...warehouseActivationDocumentation.requiredChildEvidence,
				],
				operation: "unblockWarehouseToActive",
				from: ["blocked"],
				to: "active",
				requiredPermission: "master_data.warehouse_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.warehouse.unblocked_to_active",
				reversible: true,
			},
			retire: {
				...rootRetirementDocumentation,
				operation: "retireWarehouse",
				from: ["active", "inactive", "blocked"],
				to: "retired",
				requiredPermission: "master_data.warehouse_retire",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				dependencyPolicy: "NONZERO_INVENTORY",
				eventType: "master_data.warehouse.retired",
				reversible: false,
			},
			archive: {
				...rootArchivalDocumentation,
				operation: "archiveWarehouse",
				from: ["draft", "inactive", "blocked", "retired"],
				to: "archived",
				requiredPermission: "master_data.warehouse_archive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.warehouse.archived",
				reversible: false,
			},
		},
	});

export const paymentTermLifecyclePolicy =
	defineLifecyclePolicy<SimpleMasterState>({
		family: "simple_master",
		entityType: "payment_term",
		transitions: {
			activate: {
				...rootActivationDocumentation,
				operation: "activatePaymentTerm",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.payment_term_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.payment_term.activated",
				reversible: true,
			},
			inactivate: {
				...rootInactivationDocumentation,
				operation: "inactivatePaymentTerm",
				from: ["active"],
				to: "inactive",
				requiredPermission: "master_data.payment_term_inactivate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.payment_term.inactivated",
				reversible: true,
			},
			archive: {
				...rootArchivalDocumentation,
				operation: "archivePaymentTerm",
				from: ["draft", "inactive"],
				to: "archived",
				requiredPermission: "master_data.payment_term_archive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.payment_term.archived",
				reversible: false,
			},
		},
	});

export const taxRegistrationLifecyclePolicy =
	defineLifecyclePolicy<EffectiveDatedState>({
		family: "effective_dated",
		entityType: "tax_registration",
		transitions: {
			activate: {
				...effectiveDatedActivationDocumentation,
				operation: "activateTaxRegistration",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.tax_registration_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.tax_registration.activated",
				reversible: true,
			},
			revoke: {
				...effectiveDatedRevocationDocumentation,
				operation: "revokeTaxRegistration",
				from: ["active", "inactive"],
				to: "revoked",
				requiredPermission: "master_data.tax_registration_revoke",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.tax_registration.revoked",
				reversible: false,
			},
			archive: {
				...rootArchivalDocumentation,
				operation: "archiveTaxRegistration",
				from: ["draft", "inactive", "expired", "revoked"],
				to: "archived",
				requiredPermission: "master_data.tax_registration_archive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.tax_registration.archived",
				reversible: false,
			},
		},
	});

export const itemTemplateLifecyclePolicy =
	defineLifecyclePolicy<SimpleMasterState>({
		family: "simple_master",
		entityType: "item_template",
		transitions: {
			activate: {
				...templateActivationDocumentation,
				operation: "activateItemTemplate",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.item_template_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.item_template.activated",
				reversible: true,
			},
			retire: {
				...childRetirementDocumentation,
				operation: "retireItemTemplate",
				from: ["active", "inactive"],
				to: "archived",
				requiredPermission: "master_data.item_template_retire",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				dependencyPolicy: "ACTIVE_VARIANTS",
				eventType: "master_data.item_template.retired",
				reversible: false,
			},
		},
	});

export const itemVariantLifecyclePolicy =
	defineLifecyclePolicy<OperationalMasterState>({
		family: "operational_master",
		entityType: "item_variant",
		transitions: {
			activate: {
				...variantActivationDocumentation,
				operation: "activateItemVariant",
				from: ["draft", "inactive"],
				to: "active",
				requiredPermission: "master_data.item_variant_activate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.item_variant.activated",
				reversible: true,
			},
			inactivate: {
				...rootInactivationDocumentation,
				operation: "inactivateItemVariant",
				from: ["active"],
				to: "inactive",
				requiredPermission: "master_data.item_variant_inactivate",
				reasonPolicy: "optional",
				expectedVersionRequired: true,
				eventType: "master_data.item_variant.inactivated",
				reversible: true,
			},
			block: {
				...rootBlockDocumentation,
				operation: "blockItemVariant",
				from: ["active", "inactive"],
				to: "blocked",
				requiredPermission: "master_data.item_variant_block",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item_variant.blocked",
				reversible: true,
			},
			unblock_to_inactive: {
				...rootUnblockToInactiveDocumentation,
				operation: "unblockItemVariantToInactive",
				from: ["blocked"],
				to: "inactive",
				requiredPermission: "master_data.item_variant_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item_variant.unblocked_to_inactive",
				reversible: true,
			},
			unblock_to_active: {
				...unblockToActiveDocumentation,
				requiredChildEvidence: [
					"resolution_reason",
					...variantActivationDocumentation.requiredChildEvidence,
				],
				operation: "unblockItemVariantToActive",
				from: ["blocked"],
				to: "active",
				requiredPermission: "master_data.item_variant_unblock",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item_variant.unblocked_to_active",
				reversible: true,
			},
			retire: {
				...childRetirementDocumentation,
				operation: "retireItemVariant",
				from: ["active", "inactive", "blocked"],
				to: "retired",
				requiredPermission: "master_data.item_variant_retire",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item_variant.retired",
				reversible: false,
			},
			archive: {
				...rootArchivalDocumentation,
				operation: "archiveItemVariant",
				from: ["draft", "inactive", "blocked", "retired"],
				to: "archived",
				requiredPermission: "master_data.item_variant_archive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				eventType: "master_data.item_variant.archived",
				reversible: false,
			},
		},
	});
