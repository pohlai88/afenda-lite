import {
	defineCorporateAdministrationCommand as command,
	defineCorporateAdministrationQuery as query,
} from "../operation-registry/types";

const owner = "establishments" as const;
const read = "corporate_administration.company.read" as const;
const manage = "corporate_administration.establishment.manage" as const;

export const establishmentOperationDefinitions = [
	command({
		id: "registerLegalEstablishment",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-establishment.register",
		eventType: "corporate_administration.legal_establishment.registered.v1",
	}),
	command({
		id: "updateLegalEstablishment",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-establishment.update",
		eventType: "corporate_administration.legal_establishment.updated.v1",
	}),
	command({
		id: "activateLegalEstablishment",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-establishment.active",
		eventType: "corporate_administration.legal_establishment.status_changed.v1",
	}),
	command({
		id: "suspendLegalEstablishment",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-establishment.suspended",
		eventType: "corporate_administration.legal_establishment.status_changed.v1",
	}),
	command({
		id: "closeLegalEstablishment",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-establishment.closed",
		eventType: "corporate_administration.legal_establishment.status_changed.v1",
	}),
	command({
		id: "setRegisteredAddress",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.registered-address.set",
		eventType: "corporate_administration.registered_address.set.v1",
	}),
	command({
		id: "registerPremise",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.premise.register",
		eventType: "corporate_administration.premise.registered.v1",
	}),
	command({
		id: "endPremise",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.premise.end",
		eventType: "corporate_administration.premise.ended.v1",
	}),
	query({ id: "getLegalEstablishment", owner, permission: read }),
	query({ id: "listLegalEstablishmentsAsOf", owner, permission: read }),
	query({ id: "findRegisteredAddressAsOf", owner, permission: read }),
	query({ id: "listPremisesAsOf", owner, permission: read }),
] as const;
