export type LocalRecoveryDrillEvidence = {
	scope: "local_recovery_drill_only";
	drill: string;
	injectedFailure: string;
	expectedControl: string;
	passed: boolean;
	details: Readonly<Record<string, string | number | boolean | null>>;
};

export type LocalRecoveryDrill = {
	name: string;
	injectedFailure: string;
	expectedControl: string;
	execute(): Promise<{
		passed: boolean;
		details: Readonly<Record<string, string | number | boolean | null>>;
	}>;
};

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
