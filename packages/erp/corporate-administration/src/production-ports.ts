import type { AddressReferencePort } from "./establishments";
import type {
	ApprovalDecisionPort,
	CorporateAdministrationRuntimePorts,
	DocumentObjectPort,
	MasterDataReconciliationPort,
	PartyReferencePort,
	ReferenceDataPort,
	TaxRegistrationReadPort,
} from "./ports";
import { createCorporateAdministrationRuntime } from "./ports";

export type CorporateAdministrationProductionRuntimeDependencies =
	CorporateAdministrationRuntimePorts;

export type CorporateAdministrationProductionBusinessPortDependencies =
	Readonly<{
		referenceData?: ReferenceDataPort;
		documentObjects?: DocumentObjectPort;
		approvalDecisions?: ApprovalDecisionPort;
		partyReferences?: PartyReferencePort;
		masterDataReconciliation?: MasterDataReconciliationPort;
		taxRegistrations?: TaxRegistrationReadPort;
		addressReferences?: AddressReferencePort;
	}>;

export type CorporateAdministrationProductionPorts =
	CorporateAdministrationRuntimePorts &
		CorporateAdministrationProductionBusinessPortDependencies;

/**
 * Production composition validator.
 *
 * Application composition owns concrete adapter construction and environment
 * access. This package only validates already-created durable dependencies and
 * returns the readonly runtime shape used by commands.
 */
export function createCorporateAdministrationProductionRuntime(
	dependencies: unknown,
): CorporateAdministrationRuntimePorts {
	return createCorporateAdministrationRuntime(dependencies);
}

export function createCorporateAdministrationProductionPorts(
	dependencies: CorporateAdministrationProductionPorts,
): CorporateAdministrationProductionPorts {
	createCorporateAdministrationRuntime(dependencies);
	return Object.freeze({ ...dependencies });
}
