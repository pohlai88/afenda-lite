export type DependencyHealth = "healthy" | "degraded" | "unavailable";

export interface OutageDependency {
	health: DependencyHealth;
	name: string;
	required: boolean;
}

export type PartialOutageDecision =
	| { action: "proceed"; unavailableOptional: readonly string[] }
	| { action: "degrade"; unavailableOptional: readonly string[] }
	| { action: "pause"; blockingDependencies: readonly string[] };

export function decidePartialOutage(
	dependencies: readonly OutageDependency[],
): PartialOutageDecision {
	const blockingDependencies = dependencies
		.filter(
			(dependency) => dependency.required && dependency.health !== "healthy",
		)
		.map((dependency) => dependency.name)
		.sort();
	if (blockingDependencies.length > 0) {
		return { action: "pause", blockingDependencies };
	}
	const unavailableOptional = dependencies
		.filter(
			(dependency) => !dependency.required && dependency.health !== "healthy",
		)
		.map((dependency) => dependency.name)
		.sort();
	return unavailableOptional.length > 0
		? { action: "degrade", unavailableOptional }
		: { action: "proceed", unavailableOptional: [] };
}
