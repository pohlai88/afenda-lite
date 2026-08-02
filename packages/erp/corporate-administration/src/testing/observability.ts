import type {
	CorporateAdministrationObservabilityPort,
	CorporateAdministrationOperationObservation,
} from "../ports";

export function createMemoryCorporateAdministrationObservabilityPort(): CorporateAdministrationObservabilityPort &
	Readonly<{ observations: CorporateAdministrationOperationObservation[] }> {
	const observations: CorporateAdministrationOperationObservation[] = [];
	return {
		observations,
		recordOperation(observation) {
			observations.push(observation);
		},
	};
}
