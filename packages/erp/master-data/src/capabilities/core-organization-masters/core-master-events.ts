/** Stable event-name suffixes emitted by core organization master aggregates. */
export type PartyLifecycleEventSuffix =
	| "activated"
	| "inactive"
	| "blocked"
	| "retired"
	| "restored";

export type ItemGroupLifecycleEventSuffix =
	| "activated"
	| "inactive"
	| "retired";

export type ItemLifecycleEventSuffix =
	| "activated"
	| "inactive"
	| "retired"
	| "restored";

export type WarehouseLifecycleEventSuffix =
	| "activated"
	| "inactive"
	| "retired";

export type PaymentTermLifecycleEventSuffix =
	| "activated"
	| "inactive"
	| "retired";

export type TaxRegistrationLifecycleEventSuffix =
	| "activated"
	| "blocked"
	| "retired"
	| "restored";

export type ItemTemplateLifecycleEventSuffix =
	| "activated"
	| "inactive"
	| "retired";
