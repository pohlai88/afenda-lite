import "server-only";

export { createMasterDataLookupPort } from "./composition/master-lookup";
export { createProductionMutationPorts } from "./composition/production-ports";
export {
	addDeliveryLine,
	cancelDelivery,
	closeDelivery,
	confirmPack,
	confirmPick,
	createDraftDelivery,
	getDeliveryById,
	getInvoiceableDelivery,
	listDeliveries,
	postDelivery,
	recordProofOfDelivery,
	startPicking,
} from "./facade/capabilities";
export type { FulfillmentCommandOptions } from "./facade/contracts";
export {
	createDrizzleFulfillmentStore,
	DrizzleFulfillmentStore,
} from "./features/deliveries/deliveries.drizzle";
export {
	createMemoryFulfillmentStore,
	MemoryFulfillmentStore,
} from "./features/deliveries/deliveries.memory";
export {
	addDeliveryLineInputSchema,
	cancelDeliveryInputSchema,
	closeDeliveryInputSchema,
	confirmPackInputSchema,
	confirmPickInputSchema,
	createDraftDeliveryInputSchema,
	getDeliveryByIdInputSchema,
	listDeliveriesInputSchema,
	postDeliveryInputSchema,
	recordProofOfDeliveryInputSchema,
	startPickingInputSchema,
} from "./features/deliveries/deliveries.schema";
export type {
	DeliveryCreateRecord,
	DeliveryLineCreateRecord,
	DeliveryListFilter,
	DeliveryPackCreateRecord,
	DeliveryPickCreateRecord,
	DeliveryStateRecord,
	FulfillmentStore,
	ProofOfDeliveryCreateRecord,
} from "./features/deliveries/deliveries.store";
export {
	DELIVERY_STATUSES,
	type Delivery,
	type DeliveryLine,
	type DeliveryPack,
	type DeliveryPick,
	type DeliveryStatus,
	POD_OUTCOMES,
	type PodOutcome,
	type ProofOfDelivery,
} from "./kernel/contracts/domain";
export type {
	AuditFactInput,
	AuditFactPort,
	FulfillableSalesOrder,
	FulfillableSalesOrderLine,
	MasterLookupPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
	SalesFulfillmentQueryPort,
} from "./kernel/contracts/ports";
export type {
	FulfillmentAuthorizationPort,
	FulfillmentPermission,
} from "./kernel/execution/authorization";
export {
	type DeliveryId,
	type DeliveryLineId,
	type DeliveryPackId,
	type DeliveryPickId,
	deliveryIdSchema,
	deliveryLineIdSchema,
	deliveryPackIdSchema,
	deliveryPickIdSchema,
	type ProofOfDeliveryId,
	proofOfDeliveryIdSchema,
} from "./kernel/identity/brands";
