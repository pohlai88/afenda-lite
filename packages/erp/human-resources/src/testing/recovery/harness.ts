export interface LocalRecoveryDrillEvidence {
	details: Readonly<Record<string, string | number | boolean | null>>;
	drill: string;
	expectedControl: string;
	injectedFailure: string;
	passed: boolean;
	scope: "local_recovery_drill_only";
}

export interface LocalRecoveryDrill {
	execute: () => Promise<{
		passed: boolean;
		details: Readonly<Record<string, string | number | boolean | null>>;
	}>;
	expectedControl: string;
	injectedFailure: string;
	name: string;
}

export async function runLocalRecoveryDrill(
	drill: LocalRecoveryDrill,
): Promise<LocalRecoveryDrillEvidence> {
	const result = await drill.execute();
	const evidence: LocalRecoveryDrillEvidence = {
		scope: "local_recovery_drill_only",
		drill: drill.name,
		injectedFailure: drill.injectedFailure,
		expectedControl: drill.expectedControl,
		passed: result.passed,
		details: result.details,
	};
	if (!evidence.passed) {
		throw new Error(`Local recovery drill failed: ${drill.name}`);
	}
	return evidence;
}
