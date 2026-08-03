/** Public "./contracts" subpath — narrow port and authorization types. */
export type {
	MasterLookupPort,
	MutationPorts,
	PurchaseOrderReceivingQueryPort,
	PurchaseOrderReceivingSnapshot,
} from "../kernel/contracts/ports";
export type {
	ReceivingAuthorizationPort,
	ReceivingPermission,
} from "../kernel/execution/authorization";
