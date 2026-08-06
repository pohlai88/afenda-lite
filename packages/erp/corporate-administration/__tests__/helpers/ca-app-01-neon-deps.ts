import { randomUUID } from "node:crypto";

import {
	createDrizzleCorporateAdministrationEstablishmentStore,
	createDrizzleCorporateAdministrationGovernanceStore,
	createDrizzleCorporateAdministrationMeetingStore,
	createDrizzleCorporateAdministrationOfficerStore,
	createDrizzleCorporateAdministrationResolutionStore,
} from "@afenda/corporate-administration/adapters/drizzle";
import { database as afendaDatabase } from "@afenda/db";
import { errorResult } from "@afenda/errors";

import { createDrizzleCompanyDependencies } from "./legal-company-test-kit";

export const CA_APP_01_TEXT_DIGEST =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export function createCaApp01EstablishmentDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		companyStore: base.store,
		establishmentStore: createDrizzleCorporateAdministrationEstablishmentStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		addressReferences: {
			getPartyAddress: async () => errorResult.ok(null),
		},
	};
}

export function createCaApp01GovernanceDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		companyStore: base.store,
		governanceStore: createDrizzleCorporateAdministrationGovernanceStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		referenceData: {
			validateSourceDocument: base.referenceData.validateSourceDocument,
		},
		partyReferences: base.partyReferences,
	};
}

export function createCaApp01OfficerDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		companyStore: base.store,
		officerStore: createDrizzleCorporateAdministrationOfficerStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		referenceData: {
			validateSourceDocument: base.referenceData.validateSourceDocument,
		},
		partyReferences: base.partyReferences,
	};
}

export function createCaApp01MeetingDependencies() {
	const base = createDrizzleCompanyDependencies();
	const governanceStore = createDrizzleCorporateAdministrationGovernanceStore({
		database: afendaDatabase.client,
		createId: randomUUID,
	});
	return {
		...base,
		companyStore: base.store,
		governanceStore,
		meetingStore: createDrizzleCorporateAdministrationMeetingStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		referenceData: {
			validateSourceDocument: base.referenceData.validateSourceDocument,
		},
		partyReferences: base.partyReferences,
	};
}

export function createCaApp01ResolutionDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		companyStore: base.store,
		resolutionStore: createDrizzleCorporateAdministrationResolutionStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		referenceData: {
			validateSourceDocument: base.referenceData.validateSourceDocument,
		},
		partyReferences: base.partyReferences,
	};
}
