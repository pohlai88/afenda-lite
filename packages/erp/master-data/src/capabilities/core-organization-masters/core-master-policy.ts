import type {
	Item,
	ItemTemplate,
	ItemVariant,
	MasterStatus,
	Party,
	PaymentTerm,
	TaxRegistration,
	Warehouse,
	WarehouseLocationType,
} from "../../types";
import { evaluateLifecycleAvailability } from "../lifecycle-governance";

const WAREHOUSE_LOCATION_RANK = {
	site: 0,
	warehouse: 1,
	zone: 2,
	aisle: 3,
	rack: 4,
	bin: 5,
} as const satisfies Record<WarehouseLocationType, number>;

/**
 * Allows skipped hierarchy levels while preventing same-level and upward nesting.
 * Cycle prevention remains a separate identity/hierarchy check.
 */
export function isWarehouseParentTypeCompatible(
	parentType: WarehouseLocationType,
	childType: WarehouseLocationType,
): boolean {
	return (
		WAREHOUSE_LOCATION_RANK[parentType] < WAREHOUSE_LOCATION_RANK[childType]
	);
}

export type CoreMasterUsability =
	| Readonly<{ usable: true }>
	| Readonly<{
			usable: false;
			reason:
				| "not_active"
				| "blocked"
				| "merged"
				| "retired"
				| "not_yet_valid"
				| "expired";
	  }>;

/** Base lifecycle eligibility; aggregate-specific requirements remain separate. */
export function evaluateMasterStatus(
	status: MasterStatus,
): CoreMasterUsability {
	const availability = evaluateLifecycleAvailability({ state: status });
	if (availability.operationallySelectable) {
		return { usable: true };
	}
	if (availability.reasons.includes("blocked")) {
		return { usable: false, reason: "blocked" };
	}
	if (availability.reasons.includes("retired")) {
		return { usable: false, reason: "retired" };
	}
	return { usable: false, reason: "not_active" };
}

export function evaluatePartyUsability(party: Party): CoreMasterUsability {
	const availability = evaluateLifecycleAvailability({
		state: party.status,
		mergedIntoId: party.mergedIntoId,
	});
	if (availability.reasons.includes("merged")) {
		return { usable: false, reason: "merged" };
	}
	return evaluateMasterStatus(party.status);
}

export function evaluateItemUsability(item: Item): CoreMasterUsability {
	return evaluateMasterStatus(item.status);
}

export function evaluateWarehouseUsability(
	warehouse: Warehouse,
): CoreMasterUsability {
	return evaluateMasterStatus(warehouse.status);
}

export function evaluatePaymentTermUsability(
	paymentTerm: PaymentTerm,
): CoreMasterUsability {
	return evaluateMasterStatus(paymentTerm.status);
}

export function evaluateTaxRegistrationUsability(
	registration: TaxRegistration,
	asOf: Date,
): CoreMasterUsability {
	const status = evaluateMasterStatus(registration.status);
	if (!status.usable) {
		return status;
	}
	if (registration.validFrom !== null && registration.validFrom > asOf) {
		return { usable: false, reason: "not_yet_valid" };
	}
	if (registration.validTo !== null && registration.validTo < asOf) {
		return { usable: false, reason: "expired" };
	}
	return { usable: true };
}

export function evaluateItemTemplateUsability(
	template: ItemTemplate,
): CoreMasterUsability {
	return evaluateMasterStatus(template.status);
}

export function evaluateItemVariantUsability(
	variant: ItemVariant,
): CoreMasterUsability {
	if (variant.retiredAt !== null) {
		return { usable: false, reason: "retired" };
	}
	// Existing variants follow their operational md_item, not template lifecycle.
	return evaluateItemUsability(variant.item);
}
