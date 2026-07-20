import { IdentityEventSchemas } from "./identity.events";
import { MasterDataEventSchemas } from "./master-data.events";
import { PlatformEventSchemas } from "./platform.events";
import { SalesEventSchemas } from "./sales.events";

export {
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityOrgRoleAssignedPayload,
	identityOrgRoleAssignedPayloadSchema,
} from "./identity.events";
export {
	MASTER_DATA_EVENT_IDS,
	type MasterDataEntityPayload,
	MasterDataEventSchemas,
	type MasterDataEventType,
	masterDataEntityPayloadSchema,
} from "./master-data.events";
export {
	PlatformEventSchemas,
	type PlatformEventType,
	type PlatformOrganizationDeletedPayload,
	platformOrganizationDeletedPayloadSchema,
} from "./platform.events";
export {
	SALES_EVENT_IDS,
	SALES_ORDER_CREATED_EVENT,
	SALES_ORDER_LINE_ADDED_EVENT,
	SALES_ORDER_POSTED_EVENT,
	SalesEventSchemas,
	type SalesEventType,
	type SalesOrderLinePayload,
	type SalesOrderPayload,
	salesOrderLinePayloadSchema,
	salesOrderPayloadSchema,
} from "./sales.events";

export const AllEventSchemas = {
	...IdentityEventSchemas,
	...PlatformEventSchemas,
	...MasterDataEventSchemas,
	...SalesEventSchemas,
} as const;

export type AllEventType = keyof typeof AllEventSchemas;

export function isKnownEventType(type: string): type is AllEventType {
	return Object.hasOwn(AllEventSchemas, type);
}
