import {
	type CorporateAdministrationDrizzleAuthorityDependencies as AuthorityDependencies,
	createDrizzleCorporateAdministrationAuthorityStore as createAuthorityStore,
} from "../../../features/authority/adapters/authority.drizzle";
import {
	createDrizzleCorporateAdministrationLegalCompanyStore as createLegalCompanyStore,
	type CorporateAdministrationDrizzleLegalCompanyDependencies as LegalCompanyDependencies,
} from "../../../features/company/adapters/company.drizzle";
import {
	createDrizzleCorporateAdministrationEstablishmentStore as createEstablishmentStore,
	type CorporateAdministrationDrizzleEstablishmentDependencies as EstablishmentDependencies,
} from "../../../features/establishments/adapters/establishments.drizzle";
import {
	createDrizzleCorporateAdministrationGovernanceStore as createGovernanceStore,
	type CorporateAdministrationDrizzleGovernanceDependencies as GovernanceDependencies,
} from "../../../features/governance/adapters/governance.drizzle";
import {
	createDrizzleCorporateAdministrationMeetingStore as createMeetingStore,
	type CorporateAdministrationDrizzleMeetingDependencies as MeetingDependencies,
} from "../../../features/meetings/adapters/meetings.drizzle";
import {
	createDrizzleCorporateAdministrationOfficerComplianceStore as createOfficerComplianceStore,
	type CorporateAdministrationDrizzleOfficerComplianceDependencies as OfficerComplianceDependencies,
} from "../../../features/officers/adapters/officer-compliance.drizzle";
import {
	createDrizzleCorporateAdministrationOfficerStore as createOfficerStore,
	type CorporateAdministrationDrizzleOfficerDependencies as OfficerDependencies,
} from "../../../features/officers/adapters/officers.drizzle";
import {
	createDrizzleCorporateAdministrationResolutionStore as createResolutionStore,
	type CorporateAdministrationDrizzleResolutionDependencies as ResolutionDependencies,
} from "../../../features/resolutions/adapters/resolutions.drizzle";

export type CorporateAdministrationDrizzleAuthorityDependencies =
	AuthorityDependencies;
export type CorporateAdministrationDrizzleLegalCompanyDependencies =
	LegalCompanyDependencies;
export type CorporateAdministrationDrizzleEstablishmentDependencies =
	EstablishmentDependencies;
export type CorporateAdministrationDrizzleGovernanceDependencies =
	GovernanceDependencies;
export type CorporateAdministrationDrizzleMeetingDependencies =
	MeetingDependencies;
export type CorporateAdministrationDrizzleOfficerComplianceDependencies =
	OfficerComplianceDependencies;
export type CorporateAdministrationDrizzleOfficerDependencies =
	OfficerDependencies;
export type CorporateAdministrationDrizzleResolutionDependencies =
	ResolutionDependencies;

export function createDrizzleCorporateAdministrationAuthorityStore(
	dependencies: CorporateAdministrationDrizzleAuthorityDependencies,
) {
	return createAuthorityStore(dependencies);
}

export function createDrizzleCorporateAdministrationLegalCompanyStore(
	dependencies: CorporateAdministrationDrizzleLegalCompanyDependencies,
) {
	return createLegalCompanyStore(dependencies);
}

export function createDrizzleCorporateAdministrationEstablishmentStore(
	dependencies: CorporateAdministrationDrizzleEstablishmentDependencies,
) {
	return createEstablishmentStore(dependencies);
}

export function createDrizzleCorporateAdministrationGovernanceStore(
	dependencies: CorporateAdministrationDrizzleGovernanceDependencies,
) {
	return createGovernanceStore(dependencies);
}

export function createDrizzleCorporateAdministrationMeetingStore(
	dependencies: CorporateAdministrationDrizzleMeetingDependencies,
) {
	return createMeetingStore(dependencies);
}

export function createDrizzleCorporateAdministrationOfficerComplianceStore(
	dependencies: CorporateAdministrationDrizzleOfficerComplianceDependencies,
) {
	return createOfficerComplianceStore(dependencies);
}

export function createDrizzleCorporateAdministrationOfficerStore(
	dependencies: CorporateAdministrationDrizzleOfficerDependencies,
) {
	return createOfficerStore(dependencies);
}

export function createDrizzleCorporateAdministrationResolutionStore(
	dependencies: CorporateAdministrationDrizzleResolutionDependencies,
) {
	return createResolutionStore(dependencies);
}
export type {
	CorporateAdministrationAuditWriter,
	CorporateAdministrationDrizzleDatabase,
	CorporateAdministrationNeonTransactionExecutor,
} from "../../../kernel/infrastructure/drizzle-dependencies";
export type { CorporateAdministrationDrizzleAuditDependencies } from "./audit";
export { createDrizzleCorporateAdministrationAuditFactPort } from "./audit";
export type { CorporateAdministrationDrizzleIdempotencyDependencies } from "./idempotency";
export { createDrizzleCorporateAdministrationIdempotencyPort } from "./idempotency";
export type {
	CorporateAdministrationDrizzleOutboxDependencies,
	CorporateAdministrationPendingEventAppender,
	CorporateAdministrationPendingOutboxEvent,
} from "./outbox";
export { createDrizzleCorporateAdministrationOutboxPort } from "./outbox";
export type { CorporateAdministrationDrizzleTransactionDependencies } from "./transaction";
export { createDrizzleCorporateAdministrationTransactionPort } from "./transaction";
