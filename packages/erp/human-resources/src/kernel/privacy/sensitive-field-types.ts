/**
 * Leaf sensitivity taxonomy for HR authorization / field projection.
 * Kept free of registry imports so policy modules can depend on it safely.
 */

export const HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES = [
	"personal_identifiers",
	"medical_leave",
	"compensation",
	"benefits",
	"employee_relations",
	"background_check",
	"performance",
	"succession",
] as const;

export type HumanResourcesSensitiveResourceType =
	(typeof HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES)[number];

export type HumanResourcesSensitiveFieldClass =
	| "personal_identifiers"
	| "medical"
	| "compensation"
	| "employee_relations_evidence"
	| "background_check"
	| "succession";
