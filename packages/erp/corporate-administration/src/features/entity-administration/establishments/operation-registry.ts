import { defineCorporateAdministrationOperationRegistry } from "../../../kernel/operations/define-registry";

const OWNER = "establishments" as const;

export const CORPORATE_ADMINISTRATION_ESTABLISHMENTS_COMMANDS =
	defineCorporateAdministrationOperationRegistry({
		registerEstablishment: {
			id: "corporate_administration.establishment.register",
			kind: "command",
			owner: OWNER,
			permission: "corporate_administration.establishment.manage",
			publicName: "registerEstablishment",
		},
		updateEstablishment: {
			id: "corporate_administration.establishment.update",
			kind: "command",
			owner: OWNER,
			permission: "corporate_administration.establishment.manage",
			publicName: "updateEstablishment",
		},
		activateEstablishment: {
			id: "corporate_administration.establishment.activate",
			kind: "command",
			owner: OWNER,
			permission: "corporate_administration.establishment.manage",
			publicName: "activateEstablishment",
		},
		suspendEstablishment: {
			id: "corporate_administration.establishment.suspend",
			kind: "command",
			owner: OWNER,
			permission: "corporate_administration.establishment.manage",
			publicName: "suspendEstablishment",
		},
		closeEstablishment: {
			id: "corporate_administration.establishment.close",
			kind: "command",
			owner: OWNER,
			permission: "corporate_administration.establishment.manage",
			publicName: "closeEstablishment",
		},
	});

export const CORPORATE_ADMINISTRATION_ESTABLISHMENTS_QUERIES =
	defineCorporateAdministrationOperationRegistry({
		getEstablishment: {
			id: "corporate_administration.establishment.get",
			kind: "query",
			owner: OWNER,
			permission: "corporate_administration.establishment.read",
			publicName: "getEstablishment",
		},
		listEstablishments: {
			id: "corporate_administration.establishment.list",
			kind: "query",
			owner: OWNER,
			permission: "corporate_administration.establishment.read",
			publicName: "listEstablishments",
		},
	});
