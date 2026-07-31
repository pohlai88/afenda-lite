import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";
import {
	evaluateLifecycleAvailability as evaluateLifecycleAvailabilityFromRoot,
	listChangeRequestsInputSchema,
	partyLifecyclePolicy as partyLifecyclePolicyFromRoot,
} from "../src";
import { updateItem } from "../src/capabilities/core-organization-masters/item";
import { updateItemGroup } from "../src/capabilities/core-organization-masters/item-group";
import { updateItemTemplate } from "../src/capabilities/core-organization-masters/item-template-variant";
import { updateParty } from "../src/capabilities/core-organization-masters/party";
import { updatePaymentTerm } from "../src/capabilities/core-organization-masters/payment-term";
import { updateTaxRegistration } from "../src/capabilities/core-organization-masters/tax-registration";
import { updateWarehouse } from "../src/capabilities/core-organization-masters/warehouse";
import {
	AGGREGATE_LIFECYCLE_FAMILY_DECLARATIONS,
	APPROVED_APPLY_REVALIDATION_REQUIREMENTS,
	approvedApplyAttemptGate,
	assertDistinctMergeParticipants,
	assertEffectiveDatedLifecycleCoherence,
	assertLifecycleExpectedVersion,
	assertLifecycleReason,
	assertMergeParticipants,
	assertNoLifecycleControlledFieldMutation,
	decideAuthoritativeLifecycleTransition,
	decideLifecycleTransition,
	dependencyResult,
	EFFECTIVE_DATED_EXTENSION_STATES,
	EFFECTIVE_DATED_RECOMMENDED_AGGREGATES,
	EFFECTIVE_DATED_STANDARD_STATE_BY_PERSISTED_STATE,
	EFFECTIVE_DATED_STATE_MEANINGS,
	EFFECTIVE_DATED_STATES,
	evaluateEffectiveDatedAvailability,
	evaluateLifecycleAvailability,
	GOVERNANCE_WORKFLOW_RECOMMENDED_AGGREGATES,
	GOVERNANCE_WORKFLOW_STANDARD_STATE_BY_PERSISTED_STATE,
	GOVERNANCE_WORKFLOW_STANDARD_STATES,
	GOVERNANCE_WORKFLOW_STATE_MEANINGS,
	GOVERNANCE_WORKFLOW_STATES,
	HISTORICAL_IDENTITY_PRESERVED_EVIDENCE,
	HISTORICAL_IDENTITY_RESOLUTION_MODES,
	HISTORICALLY_RESOLVABLE_LIFECYCLE_STATES,
	itemGroupLifecyclePolicy,
	itemLifecyclePolicy,
	itemTemplateLifecyclePolicy,
	itemVariantLifecyclePolicy,
	LIFECYCLE_AVAILABILITY_FACETS,
	LIFECYCLE_FAMILY_STATES,
	LIFECYCLE_STANDARD_FAMILY_STATES,
	LIFECYCLE_STANDARD_STATE_ALIASES,
	lifecycleReason,
	nextLifecycleVersion,
	OPERATIONAL_MASTER_RECOMMENDED_AGGREGATES,
	OPERATIONAL_MASTER_STANDARD_STATE_BY_PERSISTED_STATE,
	OPERATIONAL_MASTER_STANDARD_STATES,
	OPERATIONAL_MASTER_STATE_MEANINGS,
	OPERATIONAL_MASTER_STATES,
	partyLifecyclePolicy,
	paymentTermLifecyclePolicy,
	resolveAuthoritativeLifecycleState,
	resolveCanonicalIdentity,
	resolveCanonicalIdentityWithLineage,
	resolveTenantScopedCasMiss,
	SIMPLE_MASTER_RECOMMENDED_AGGREGATES,
	SIMPLE_MASTER_STATE_MEANINGS,
	SIMPLE_MASTER_STATES,
	SIMPLE_REFERENCE_MASTER_STATES,
	SIMPLE_REFERENCE_STANDARD_STATE_BY_PERSISTED_STATE,
	taxRegistrationLifecyclePolicy,
	toStandardLifecycleState,
	warehouseLifecyclePolicy,
} from "../src/capabilities/lifecycle-governance";
import { runSequentially } from "../src/resolve-async";
import { CHANGE_REQUEST_STATUSES, MASTER_STATUSES } from "../src/types";

describe("lifecycle governance capability", () => {
	it("declares aggregate lifecycle families and explicit transitions", () => {
		expect(AGGREGATE_LIFECYCLE_FAMILY_DECLARATIONS).toEqual({
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
		});
		expect(partyLifecyclePolicy.family).toBe("operational_master");
		expect(partyLifecyclePolicy.transitions.merge).toMatchObject({
			from: ["active", "inactive", "blocked"],
			to: "merged",
			reasonPolicy: "required",
			expectedVersionRequired: true,
		});

		expect(itemLifecyclePolicy.transitions.archive.from).not.toContain(
			"active",
		);
		expect(itemGroupLifecyclePolicy.family).toBe("simple_master");
		expect(warehouseLifecyclePolicy.transitions.retire.dependencyPolicy).toBe(
			"NONZERO_INVENTORY",
		);
		expect(itemVariantLifecyclePolicy.family).toBe("operational_master");
		expect(taxRegistrationLifecyclePolicy.family).toBe("effective_dated");
	});

	it("documents the operational-master lifecycle family", () => {
		expect(OPERATIONAL_MASTER_RECOMMENDED_AGGREGATES).toEqual([
			"party",
			"item",
			"warehouse",
			"item_variant",
		]);
		expect(OPERATIONAL_MASTER_STATES).toEqual([
			"draft",
			"active",
			"inactive",
			"blocked",
			"retired",
			"archived",
			"merged",
		]);
		expect(LIFECYCLE_FAMILY_STATES.operational_master).toBe(
			OPERATIONAL_MASTER_STATES,
		);
		expect(OPERATIONAL_MASTER_STATE_MEANINGS).toEqual({
			draft: "Incomplete or not approved for operational use",
			active: "Available for permitted operational use",
			inactive: "Temporarily unavailable for new use; may be restored",
			blocked:
				"Explicitly prohibited because of risk, compliance, or governance",
			retired: "Permanently withdrawn from future operational use",
			archived: "Removed from normal working views; retained historically",
			merged: "Superseded by a canonical master record",
		});
		expect(itemLifecyclePolicy.transitions).not.toHaveProperty("merge");
		expect(warehouseLifecyclePolicy.transitions).not.toHaveProperty("merge");
		expect(itemVariantLifecyclePolicy.transitions).not.toHaveProperty("merge");
	});

	it("publishes exact canonical lifecycle standards by shared family", () => {
		expect(SIMPLE_REFERENCE_MASTER_STATES).toEqual([
			"draft",
			"active",
			"inactive",
			"archived",
		]);
		expect(OPERATIONAL_MASTER_STANDARD_STATES).toEqual([
			"draft",
			"active",
			"suspended",
			"archived",
		]);
		expect(EFFECTIVE_DATED_EXTENSION_STATES).toEqual([
			"pending",
			"active",
			"expired",
			"revoked",
			"archived",
		]);
		expect(GOVERNANCE_WORKFLOW_STANDARD_STATES).toEqual([
			"draft",
			"submitted",
			"approved",
			"rejected",
			"applied",
			"cancelled",
			"failed",
		]);
		expect(LIFECYCLE_STANDARD_FAMILY_STATES).toEqual({
			simple_master: SIMPLE_REFERENCE_MASTER_STATES,
			operational_master: OPERATIONAL_MASTER_STANDARD_STATES,
			effective_dated: EFFECTIVE_DATED_EXTENSION_STATES,
			governance_workflow: GOVERNANCE_WORKFLOW_STANDARD_STATES,
		});
	});

	it("maps persisted legacy statuses to canonical lifecycle standards", () => {
		expect(OPERATIONAL_MASTER_STANDARD_STATE_BY_PERSISTED_STATE).toEqual({
			draft: "draft",
			active: "active",
			inactive: "suspended",
			blocked: "suspended",
			retired: "archived",
			archived: "archived",
			merged: "archived",
		});
		expect(SIMPLE_REFERENCE_STANDARD_STATE_BY_PERSISTED_STATE).toEqual({
			draft: "draft",
			active: "active",
			inactive: "inactive",
			archived: "archived",
		});
		expect(EFFECTIVE_DATED_STANDARD_STATE_BY_PERSISTED_STATE).toEqual({
			draft: "pending",
			active: "active",
			inactive: "pending",
			expired: "expired",
			revoked: "revoked",
			archived: "archived",
		});
		expect(GOVERNANCE_WORKFLOW_STANDARD_STATE_BY_PERSISTED_STATE).toEqual({
			draft: "draft",
			submitted: "submitted",
			approved: "approved",
			rejected: "rejected",
			applying: "approved",
			applied: "applied",
			failed: "failed",
			cancelled: "cancelled",
			expired: "cancelled",
			superseded: "cancelled",
		});
		expect(LIFECYCLE_STANDARD_STATE_ALIASES.operational_master).toBe(
			OPERATIONAL_MASTER_STANDARD_STATE_BY_PERSISTED_STATE,
		);
		expect(toStandardLifecycleState("operational_master", "blocked")).toBe(
			"suspended",
		);
		expect(toStandardLifecycleState("effective_dated", "draft")).toBe(
			"pending",
		);
		expect(() => toStandardLifecycleState("simple_master", "blocked")).toThrow(
			"Unknown simple_master lifecycle state: blocked",
		);
	});

	it("documents the simple-master lifecycle family", () => {
		expect(SIMPLE_MASTER_RECOMMENDED_AGGREGATES).toEqual([
			"organization_dimension",
			"item_group",
			"payment_term",
		]);
		expect(SIMPLE_MASTER_STATES).toEqual([
			"draft",
			"active",
			"inactive",
			"archived",
		]);
		expect(LIFECYCLE_FAMILY_STATES.simple_master).toBe(SIMPLE_MASTER_STATES);
		expect(SIMPLE_MASTER_STATE_MEANINGS).toEqual({
			draft: "Incomplete or not approved for use",
			active: "Available for permitted assignment or use",
			inactive: "Temporarily unavailable for new assignment; may be restored",
			archived: "Removed from normal working views; retained historically",
		});
	});

	it("documents the effective-dated lifecycle family and date coherence", () => {
		const asOf = new Date("2026-07-27T00:00:00.000Z");
		expect(EFFECTIVE_DATED_RECOMMENDED_AGGREGATES).toEqual([
			"tax_registration",
			"party_role",
			"party_address",
			"party_contact",
			"party_external_id",
			"party_relationship",
		]);
		expect(EFFECTIVE_DATED_STATES).toEqual([
			"draft",
			"active",
			"inactive",
			"expired",
			"revoked",
			"archived",
		]);
		expect(LIFECYCLE_FAMILY_STATES.effective_dated).toBe(
			EFFECTIVE_DATED_STATES,
		);
		expect(EFFECTIVE_DATED_STATE_MEANINGS).toEqual({
			draft: "Incomplete or not approved for effective use",
			active:
				"Approved and available when the effective range includes the as-of instant",
			inactive: "Temporarily unavailable for new effective use",
			expired:
				"No longer effective because its approved effective range has ended",
			revoked: "Explicitly withdrawn before ordinary expiry",
			archived: "Removed from normal working views; retained historically",
		});

		expect(
			evaluateEffectiveDatedAvailability({
				status: "active",
				effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
				effectiveTo: null,
				asOf,
			}),
		).toEqual({
			storedStatus: "active",
			storedActive: true,
			effectiveFromSatisfied: true,
			effectiveToSatisfied: true,
			effectiveAvailable: true,
		});
		expect(
			evaluateEffectiveDatedAvailability({
				status: "active",
				effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
				effectiveTo: null,
				asOf,
			}),
		).toMatchObject({
			storedActive: true,
			effectiveFromSatisfied: false,
			effectiveAvailable: false,
		});
		expect(
			evaluateEffectiveDatedAvailability({
				status: "inactive",
				effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
				effectiveTo: null,
				asOf,
			}),
		).toMatchObject({
			storedStatus: "inactive",
			storedActive: false,
			effectiveAvailable: false,
		});

		expect(
			assertEffectiveDatedLifecycleCoherence(
				{
					status: "active",
					effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
					effectiveTo: null,
					asOf,
				},
				{ entityType: "tax_registration", entityId: "tax-1" },
			),
		).toEqual({ ok: true, data: true });
		const incoherent = assertEffectiveDatedLifecycleCoherence(
			{
				status: "active",
				effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
				effectiveTo: null,
				asOf,
			},
			{ entityType: "tax_registration", entityId: "tax-1" },
		);
		expect(incoherent.ok).toBe(false);
	});

	it("documents governance workflow states without reusing them as operational master states", () => {
		expect(GOVERNANCE_WORKFLOW_RECOMMENDED_AGGREGATES).toEqual([
			"change_request",
			"import_batch",
			"merge_request",
		]);
		expect(GOVERNANCE_WORKFLOW_STATES).toEqual([
			"draft",
			"submitted",
			"approved",
			"rejected",
			"applying",
			"applied",
			"failed",
			"cancelled",
			"expired",
			"superseded",
		]);
		expect(LIFECYCLE_FAMILY_STATES.governance_workflow).toBe(
			GOVERNANCE_WORKFLOW_STATES,
		);
		expect(GOVERNANCE_WORKFLOW_STATE_MEANINGS).toMatchObject({
			submitted: "Workflow work item is waiting for review or approval",
			approved: "Workflow work item is approved for a governed apply attempt",
			applied: "Workflow work item was successfully applied",
			superseded:
				"Workflow work item was replaced by another governance record",
		});
		const governanceOnlyStates = GOVERNANCE_WORKFLOW_STATES.filter(
			(state) =>
				!(
					SIMPLE_MASTER_STATES.includes(
						state as (typeof SIMPLE_MASTER_STATES)[number],
					) ||
					EFFECTIVE_DATED_STATES.includes(
						state as (typeof EFFECTIVE_DATED_STATES)[number],
					)
				),
		);
		for (const state of governanceOnlyStates) {
			expect(OPERATIONAL_MASTER_STATES).not.toContain(state);
			expect(MASTER_STATUSES).not.toContain(
				state as (typeof MASTER_STATUSES)[number],
			);
		}
	});

	it("uses the governance workflow family for change-request query status filters", () => {
		expect(CHANGE_REQUEST_STATUSES).toBe(GOVERNANCE_WORKFLOW_STATES);
		for (const status of GOVERNANCE_WORKFLOW_STATES) {
			const parsed = listChangeRequestsInputSchema.safeParse({
				organizationId: "org-a",
				actorUserId: "user-1",
				status,
			});
			expect(parsed.success).toBe(true);
			if (parsed.success) {
				expect(parsed.data.status).toBe(status);
			}
		}
		expect(
			listChangeRequestsInputSchema.safeParse({
				organizationId: "org-a",
				actorUserId: "user-1",
				status: "active",
			}).success,
		).toBe(false);
	});

	it("treats approval as an attempt gate, not lifecycle bypass", () => {
		expect(APPROVED_APPLY_REVALIDATION_REQUIREMENTS).toEqual([
			"current_record_version",
			"current_lifecycle_state",
			"current_dependencies",
			"current_authorization",
			"current_uniqueness_constraints",
			"current_parent_child_invariants",
			"current_merge_status",
		]);

		expect(
			approvedApplyAttemptGate("change_request", "named_domain_command"),
		).toEqual({
			ok: true,
			data: {
				approvalSource: "change_request",
				revalidatedBy: "named_domain_command",
				requirements: APPROVED_APPLY_REVALIDATION_REQUIREMENTS,
			},
		});
	});

	it("returns typed decisions and lifecycle errors", () => {
		const active = decideLifecycleTransition(
			"draft",
			"activate",
			partyLifecyclePolicy,
			{ entityId: "party-1" },
		);
		expect(active.ok).toBe(true);
		if (active.ok) {
			expect(active.data).toMatchObject({
				from: "draft",
				to: "active",
				operation: "activateParty",
			});
		}

		const archived = decideLifecycleTransition(
			"active",
			"archive",
			partyLifecyclePolicy,
			{ entityId: "party-1" },
		);
		expect(archived.ok).toBe(false);
	});

	it("uses named domain operations in transition definitions", () => {
		expect(partyLifecyclePolicy.transitions.activate.operation).toBe(
			"activateParty",
		);
		expect(partyLifecyclePolicy.transitions.merge.operation).toBe(
			"mergeParties",
		);
		expect(itemLifecyclePolicy.transitions.retire.operation).toBe("retireItem");
		expect(warehouseLifecyclePolicy.transitions.block.operation).toBe(
			"blockWarehouse",
		);
	});

	it("codifies operational shutdown, unblock, retirement, and archive sequencing", () => {
		expect(itemLifecyclePolicy.transitions.inactivate).toMatchObject({
			from: ["active"],
			to: "inactive",
			permitsNewTransactionalUse: false,
			reversible: true,
		});
		expect(
			itemLifecyclePolicy.transitions.inactivate.requiredChildEvidence,
		).toEqual([]);

		for (const policy of [
			partyLifecyclePolicy,
			itemLifecyclePolicy,
			warehouseLifecyclePolicy,
			itemVariantLifecyclePolicy,
		] as const) {
			expect(policy.transitions.block).toMatchObject({
				from: ["active", "inactive"],
				to: "blocked",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				permitsNewTransactionalUse: false,
			});
			expect(policy.transitions.block.requiredChildEvidence).toContain(
				"block_reason",
			);
			expect(policy.transitions.block.requiredPermission).toMatch(/_block$/u);

			expect(policy.transitions.unblock_to_inactive).toMatchObject({
				from: ["blocked"],
				to: "inactive",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				permitsNewTransactionalUse: false,
			});
			expect(
				policy.transitions.unblock_to_inactive.requiredChildEvidence,
			).toContain("resolution_reason");
			expect(policy.transitions.unblock_to_inactive.requiredPermission).toMatch(
				/_unblock$/u,
			);

			expect(policy.transitions.unblock_to_active).toMatchObject({
				from: ["blocked"],
				to: "active",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				permitsNewTransactionalUse: true,
			});
			expect(
				policy.transitions.unblock_to_active.requiredChildEvidence,
			).toContain("resolution_reason");
			expect(policy.transitions.unblock_to_active.requiredPermission).toMatch(
				/_unblock$/u,
			);
			expect(policy.transitions.unblock_to_active.eventType).not.toBe(
				policy.transitions.unblock_to_inactive.eventType,
			);

			expect(policy.transitions.retire).toMatchObject({
				from: ["active", "inactive", "blocked"],
				to: "retired",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				reversible: false,
				permitsNewTransactionalUse: false,
			});
			expect(policy.transitions.retire.requiredChildEvidence).toContain(
				"retirement_reason",
			);
			expect(policy.transitions.archive).toMatchObject({
				from: ["draft", "inactive", "blocked", "retired"],
				to: "archived",
				reasonPolicy: "required",
				expectedVersionRequired: true,
				reversible: false,
				permitsNewTransactionalUse: false,
			});
			expect(policy.transitions.archive.from).not.toContain("active");
		}

		const directActiveArchive = decideLifecycleTransition(
			"active",
			"archive",
			itemVariantLifecyclePolicy,
			{ entityId: "variant-1" },
		);
		expect(directActiveArchive.ok).toBe(false);
	});

	it("requires every transition definition to carry execution and documentation metadata", () => {
		const policies = [
			partyLifecyclePolicy,
			itemLifecyclePolicy,
			itemGroupLifecyclePolicy,
			warehouseLifecyclePolicy,
			paymentTermLifecyclePolicy,
			taxRegistrationLifecyclePolicy,
			itemTemplateLifecyclePolicy,
			itemVariantLifecyclePolicy,
		] as const;

		for (const policy of policies) {
			for (const transition of Object.values(policy.transitions)) {
				expect(transition.operation).toMatch(/^[a-z]/u);
				expect(transition.from.length).toBeGreaterThan(0);
				expect(transition.to).toBeTruthy();
				expect(transition.requiredPermission).toMatch(/^master_data\./u);
				expect(["optional", "required"]).toContain(transition.reasonPolicy);
				expect(transition.expectedVersionRequired).toBe(true);
				expect(transition.eventType).toMatch(/^master_data\./u);
				expect(transition.auditAction).toBe("UPDATE");
				expect(typeof transition.reversible).toBe("boolean");
				expect(
					transition.requiredParentState === null ||
						transition.requiredParentState.length > 0,
				).toBe(true);
				expect(Array.isArray(transition.requiredChildEvidence)).toBe(true);
				expect(transition.effectiveDateBehavior.length).toBeGreaterThan(0);
				expect(transition.canonicalIdentityBehavior.length).toBeGreaterThan(0);
				expect(transition.searchProjectionConsequence.length).toBeGreaterThan(
					0,
				);
				expect(typeof transition.permitsNewTransactionalUse).toBe("boolean");
			}
		}
	});

	it("documents draft-to-active root activation evidence per aggregate", () => {
		expect(
			partyLifecyclePolicy.transitions.activate.requiredChildEvidence,
		).toEqual([
			"required_fields_complete",
			"valid_normalized_code",
			"no_uniqueness_conflict",
			"active_party_role",
			"not_merged",
		]);
		expect(
			itemLifecyclePolicy.transitions.activate.requiredChildEvidence,
		).toEqual([
			"required_fields_complete",
			"valid_normalized_code",
			"no_uniqueness_conflict",
			"active_item_group",
			"active_base_uom",
		]);
		expect(
			warehouseLifecyclePolicy.transitions.activate.requiredChildEvidence,
		).toEqual([
			"required_fields_complete",
			"valid_normalized_code",
			"valid_organization_scope",
			"required_location_data",
			"active_parent_when_nested",
		]);
		expect(
			itemVariantLifecyclePolicy.transitions.activate.requiredChildEvidence,
		).toEqual([
			"required_fields_complete",
			"valid_normalized_code",
			"active_template",
			"complete_required_attributes",
			"active_item_group",
			"active_base_uom",
		]);
	});

	it("rejects lifecycle-controlled fields in generic mutation input", () => {
		const blocked = assertNoLifecycleControlledFieldMutation(
			{
				id: "party-1",
				status: "active",
				lifecycleState: "retired",
				mergedIntoId: "party-2",
			},
			{ entityType: "party", entityId: "party-1" },
		);
		expect(blocked.ok).toBe(false);
	});

	it("rejects direct lifecycle mutation through general update commands", async () => {
		const base = {
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			id: "00000000-0000-4000-8000-000000000001",
			expectedVersion: 1,
			status: "active",
		};
		const commands = [
			updateParty,
			updateItem,
			updateItemGroup,
			updateWarehouse,
			updatePaymentTerm,
			updateTaxRegistration,
			updateItemTemplate,
		] as const;

		await runSequentially(commands, async (command) => {
			const result = await command(base);
			expect(result.ok).toBe(false);
		});
	});

	it("uses explicit authoritative state instead of derived lifecycle signals", () => {
		const stored = resolveAuthoritativeLifecycleState(
			{
				status: "active" as const,
				retiredAt: new Date("2026-01-01T00:00:00.000Z"),
				hasActiveDependencies: false,
				searchVisible: false,
				uiDisabled: true,
			},
			(record) => record.status,
			{ entityType: "party", entityId: "party-1" },
		);
		expect(stored).toEqual({
			ok: true,
			data: { state: "active", source: "authoritative_record" },
		});
		if (!stored.ok) {
			return;
		}

		const decision = decideAuthoritativeLifecycleTransition(
			stored.data,
			"inactivate",
			partyLifecyclePolicy,
			{ entityId: "party-1" },
		);
		expect(decision.ok).toBe(true);
		if (decision.ok) {
			expect(decision.data.from).toBe("active");
			expect(decision.data.to).toBe("inactive");
		}
	});

	it("rejects lifecycle decisions when explicit stored state is missing", () => {
		const missing = resolveAuthoritativeLifecycleState(
			{
				retiredAt: new Date("2026-01-01T00:00:00.000Z"),
				searchVisible: false,
				uiDisabled: true,
			},
			(record) =>
				"status" in record ? (record.status as string | undefined) : undefined,
			{ entityType: "party", entityId: "party-1" },
		);
		expect(missing.ok).toBe(false);
	});

	it("enforces reason-required transitions without free-form-only reasons", () => {
		const decision = decideLifecycleTransition(
			"active",
			"block",
			partyLifecyclePolicy,
		);
		expect(decision.ok).toBe(true);
		if (!decision.ok) {
			return;
		}

		const missing = assertLifecycleReason(decision.data, undefined, {
			entityType: "party",
			entityId: "party-1",
		});
		expect(missing.ok).toBe(false);

		expect(
			assertLifecycleReason(
				decision.data,
				lifecycleReason("governance_block", "Risk review"),
				{ entityType: "party", entityId: "party-1" },
			),
		).toEqual({ ok: true, data: true });
	});

	it("centralizes expected-version CAS mechanics", () => {
		expect(
			assertLifecycleExpectedVersion({ id: "item-1", version: 2 }, 2, {
				entityType: "item",
			}),
		).toEqual({ ok: true, data: true });

		const stale = assertLifecycleExpectedVersion(
			{ id: "item-1", version: 2 },
			1,
			{ entityType: "item" },
		);
		expect(stale.ok).toBe(false);

		expect(nextLifecycleVersion(2)).toBe(3);
	});

	it("interprets zero-row CAS updates with tenant-scoped probes", async () => {
		const missing = await resolveTenantScopedCasMiss({
			entityType: "party",
			entityId: "party-cross-org",
			expectedVersion: 3,
			loadCurrent: async () => errorResult.ok(null),
			notFoundMessage: "Party not found",
			unchangedMissMessage: "Party update did not satisfy mutation guards",
		});
		expect(missing.ok).toBe(false);
		if (!missing.ok) {
			expect(missing.code).toBe("NOT_FOUND");
		}

		const stale = await resolveTenantScopedCasMiss({
			entityType: "party",
			entityId: "party-1",
			expectedVersion: 3,
			loadCurrent: async () => errorResult.ok({ id: "party-1", version: 4 }),
			notFoundMessage: "Party not found",
			unchangedMissMessage: "Party update did not satisfy mutation guards",
		});
		expect(stale.ok).toBe(false);
		if (!stale.ok) {
			expect(stale.code).toBe("CONFLICT");
		}

		const guarded = await resolveTenantScopedCasMiss({
			entityType: "party",
			entityId: "party-1",
			expectedVersion: 3,
			loadCurrent: async () => errorResult.ok({ id: "party-1", version: 3 }),
			notFoundMessage: "Party not found",
			unchangedMissMessage: "Party update did not satisfy mutation guards",
		});
		expect(guarded.ok).toBe(false);
	});

	it("uses stable dependency codes and merge participant policy", () => {
		expect(dependencyResult([])).toEqual({ blocked: false });
		expect(dependencyResult(["ACTIVE_CHILDREN"])).toEqual({
			blocked: true,
			codes: ["ACTIVE_CHILDREN"],
		});

		expect(assertDistinctMergeParticipants("a", "b")).toEqual({
			ok: true,
			data: true,
		});
		expect(assertDistinctMergeParticipants("a", "a").ok).toBe(false);

		const mergedTarget = assertMergeParticipants(
			{ id: "source", organizationId: "org", mergedIntoId: null },
			{ id: "target", organizationId: "org", mergedIntoId: "canonical" },
			"party",
		);
		expect(mergedTarget.ok).toBe(false);
	});

	it("resolves canonical identity distinctly from exact identity", async () => {
		const nodes = new Map([
			["source", { id: "source", mergedIntoId: "target" }],
			["target", { id: "target", mergedIntoId: null }],
		]);
		const canonical = await resolveCanonicalIdentity("source", async (id) =>
			errorResult.ok(nodes.get(id) ?? null),
		);
		expect(canonical).toEqual({ ok: true, data: { id: "target", hops: 1 } });

		const cycle = await resolveCanonicalIdentity("a", async (id) =>
			errorResult.ok(
				id === "a"
					? { id: "a", mergedIntoId: "b" }
					: { id: "b", mergedIntoId: "a" },
			),
		);
		expect(cycle.ok).toBe(false);
	});

	it("documents historical identity preservation and canonical lineage", async () => {
		expect(HISTORICALLY_RESOLVABLE_LIFECYCLE_STATES).toEqual([
			"draft",
			"active",
			"inactive",
			"blocked",
			"retired",
			"archived",
			"merged",
			"expired",
			"revoked",
		]);
		expect(HISTORICAL_IDENTITY_PRESERVED_EVIDENCE).toEqual([
			"identifiers",
			"historical_names",
			"external_ids",
			"audit_evidence",
			"prior_transactional_references",
			"merge_lineage",
		]);
		expect(HISTORICAL_IDENTITY_RESOLUTION_MODES).toEqual([
			"exact_identity",
			"canonical_identity",
		]);

		const nodes = new Map([
			["source", { id: "source", mergedIntoId: "target" }],
			["target", { id: "target", mergedIntoId: null }],
		]);
		const canonical = await resolveCanonicalIdentityWithLineage(
			"source",
			async (id) => errorResult.ok(nodes.get(id) ?? null),
		);
		expect(canonical).toEqual({
			ok: true,
			data: {
				requestedId: "source",
				canonicalId: "target",
				hops: 1,
				lineage: ["source", "target"],
			},
		});
	});

	it("keeps lifecycle and availability query meanings distinct", () => {
		expect(LIFECYCLE_AVAILABILITY_FACETS).toEqual([
			"exists",
			"historically_resolvable",
			"active",
			"operationally_selectable",
			"canonical",
		]);

		expect(
			evaluateLifecycleAvailability({ state: null, exists: false }),
		).toEqual({
			exists: false,
			historicallyResolvable: false,
			active: false,
			operationallySelectable: false,
			canonical: false,
			reasons: ["not_found"],
		});
		expect(evaluateLifecycleAvailability({ state: "inactive" })).toEqual({
			exists: true,
			historicallyResolvable: true,
			active: false,
			operationallySelectable: false,
			canonical: true,
			reasons: ["not_active"],
		});
		expect(evaluateLifecycleAvailability({ state: "blocked" })).toEqual({
			exists: true,
			historicallyResolvable: true,
			active: false,
			operationallySelectable: false,
			canonical: true,
			reasons: ["blocked"],
		});
		expect(
			evaluateLifecycleAvailability({
				state: "active",
				mergedIntoId: "canonical-party",
			}),
		).toEqual({
			exists: true,
			historicallyResolvable: true,
			active: true,
			operationallySelectable: false,
			canonical: false,
			reasons: ["merged", "not_canonical"],
		});
		expect(evaluateLifecycleAvailability({ state: "active" })).toEqual({
			exists: true,
			historicallyResolvable: true,
			active: true,
			operationallySelectable: true,
			canonical: true,
			reasons: [],
		});
	});

	it("keeps lifecycle governance as a package-owned capability", () => {
		expect(partyLifecyclePolicy.entityType).toBe("party");
		expect(decideLifecycleTransition).toBeTypeOf("function");
		expect(assertLifecycleExpectedVersion).toBeTypeOf("function");
	});

	it("exports lifecycle governance through the package root", () => {
		expect(partyLifecyclePolicyFromRoot).toBe(partyLifecyclePolicy);
		expect(evaluateLifecycleAvailabilityFromRoot({ state: "active" })).toEqual(
			evaluateLifecycleAvailability({ state: "active" }),
		);
	});
});
