import { IdentityEventSchemas } from "./identity.events";
import { InventoryEventSchemas } from "./inventory.events";
import { MasterDataEventSchemas } from "./master-data.events";
import { PlatformEventSchemas } from "./platform.events";
import { PurchasingEventSchemas } from "./purchasing.events";
import { SalesEventSchemas } from "./sales.events";

export {
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityOrgRoleAssignedPayload,
	identityOrgRoleAssignedPayloadSchema,
} from "./identity.events";
export {
	INVENTORY_EVENT_IDS,
	INVENTORY_MOVEMENT_CREATED_EVENT,
	INVENTORY_MOVEMENT_POSTED_EVENT,
	INVENTORY_RESERVATION_RELEASED_EVENT,
	INVENTORY_STOCK_RESERVED_EVENT,
	InventoryEventSchemas,
	type InventoryEventType,
	type StockMovementPayload,
	type StockReservationPayload,
	stockMovementPayloadSchema,
	stockReservationPayloadSchema,
} from "./inventory.events";
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
	PURCHASING_EVENT_IDS,
	PURCHASING_ORDER_CANCELLED_EVENT,
	PURCHASING_ORDER_CREATED_EVENT,
	PURCHASING_ORDER_LINE_ADDED_EVENT,
	PURCHASING_ORDER_POSTED_EVENT,
	type PurchaseOrderLinePayload,
	type PurchaseOrderPayload,
	PurchasingEventSchemas,
	type PurchasingEventType,
	purchaseOrderLinePayloadSchema,
	purchaseOrderPayloadSchema,
} from "./purchasing.events";
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
	...PurchasingEventSchemas,
	...SalesEventSchemas,
	...InventoryEventSchemas,
} as const;

export type AllEventType = keyof typeof AllEventSchemas;

export function isKnownEventType(type: string): type is AllEventType {
	return Object.hasOwn(AllEventSchemas, type);
}
