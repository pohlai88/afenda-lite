export type MigrationRecoveryDecision =
	| "forward_repair"
	| "rollback_application"
	| "halt_and_escalate";

export function decideMigrationRecovery(input: {
	migrationApplied: boolean;
	migrationReversible: boolean;
	previousApplicationCompatible: boolean;
	dataWriteObserved: boolean;
}): MigrationRecoveryDecision {
	if (!input.migrationApplied) return "rollback_application";
	if (
		input.migrationReversible &&
		input.previousApplicationCompatible &&
		!input.dataWriteObserved
	) {
		return "rollback_application";
	}
	if (!input.migrationReversible || input.dataWriteObserved) {
		return "forward_repair";
	}
	return "halt_and_escalate";
}

export type PrivacyContainmentDecision = {
	action: "contain" | "monitor";
	revokeConnector: boolean;
	quarantineQueue: boolean;
	preserveAuditEvidence: true;
};

export function decidePrivacyContainment(input: {
	crossTenantExposure: boolean;
	piiInTelemetry: boolean;
	credentialExposure: boolean;
}): PrivacyContainmentDecision {
	const contain =
		input.crossTenantExposure ||
		input.piiInTelemetry ||
		input.credentialExposure;
	return {
		action: contain ? "contain" : "monitor",
		revokeConnector: input.credentialExposure || input.crossTenantExposure,
		quarantineQueue: input.crossTenantExposure || input.piiInTelemetry,
		preserveAuditEvidence: true,
	};
}

export type RollbackCompatibilityDecision =
	| "rollback_compatible"
	| "forward_repair_required"
	| "rollback_blocked";

export function decideRollbackCompatibility(input: {
	previousReaderSupportsCurrentSchema: boolean;
	irreversibleMigrationApplied: boolean;
	newWriteShapeObserved: boolean;
}): RollbackCompatibilityDecision {
	if (input.irreversibleMigrationApplied || input.newWriteShapeObserved) {
		return "forward_repair_required";
	}
	return input.previousReaderSupportsCurrentSchema
		? "rollback_compatible"
		: "rollback_blocked";
}

export type EffectiveDatedVersion = {
	id: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "superseded";
	value: string;
	supersedesId: string | null;
};

function dayBefore(isoDate: string): string {
	const date = new Date(`${isoDate}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - 1);
	return date.toISOString().slice(0, 10);
}

export function applyEffectiveDatedCorrection(input: {
	current: EffectiveDatedVersion;
	correctionId: string;
	effectiveFrom: string;
	value: string;
}): { superseded: EffectiveDatedVersion; correction: EffectiveDatedVersion } {
	if (input.current.status !== "active") {
		throw new Error("Only active effective-dated records can be corrected");
	}
	const proposedEnd = dayBefore(input.effectiveFrom);
	const safeEnd =
		proposedEnd < input.current.effectiveFrom
			? input.current.effectiveFrom
			: proposedEnd;
	return {
		superseded: {
			...input.current,
			status: "superseded",
			effectiveTo: input.current.effectiveTo ?? safeEnd,
		},
		correction: {
			id: input.correctionId,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: null,
			status: "active",
			value: input.value,
			supersedesId: input.current.id,
		},
	};
}
