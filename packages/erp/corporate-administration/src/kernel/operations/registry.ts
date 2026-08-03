import {
	CORPORATE_ADMINISTRATION_ESTABLISHMENTS_COMMANDS,
	CORPORATE_ADMINISTRATION_ESTABLISHMENTS_QUERIES,
} from "../../features/entity-administration/establishments/operation-registry";
import {
	composeCorporateAdministrationOperationRegistries,
	projectCorporateAdministrationAuthorization,
	projectCorporateAdministrationOperationIds,
} from "./define-registry";

const COMMANDS = composeCorporateAdministrationOperationRegistries(
	CORPORATE_ADMINISTRATION_ESTABLISHMENTS_COMMANDS,
);
const QUERIES = composeCorporateAdministrationOperationRegistries(
	CORPORATE_ADMINISTRATION_ESTABLISHMENTS_QUERIES,
);

export const CORPORATE_ADMINISTRATION_COMMAND_IDS =
	projectCorporateAdministrationOperationIds(COMMANDS);
export const CORPORATE_ADMINISTRATION_QUERY_IDS =
	projectCorporateAdministrationOperationIds(QUERIES);
/** No emitted events are wired yet — event schemas land in a later slice. */
export const CORPORATE_ADMINISTRATION_EMITTED_EVENT_IDS = [] as const;
export const CORPORATE_ADMINISTRATION_COMMAND_AUTHORIZATION =
	projectCorporateAdministrationAuthorization(COMMANDS);
export const CORPORATE_ADMINISTRATION_QUERY_AUTHORIZATION =
	projectCorporateAdministrationAuthorization(QUERIES);
