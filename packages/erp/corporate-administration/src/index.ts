import "server-only";

export {
	createDrizzleCorporateAdministrationStore,
	type DrizzleCorporateAdministrationStore,
} from "./composition/adapters/drizzle";
export { corporateAdministrationModuleManifest } from "./composition/module.manifest";
export type { CorporateAdministrationStore } from "./composition/store/contract";
export {
	activateEstablishment,
	closeEstablishment,
	getEstablishment,
	listEstablishments,
	registerEstablishment,
	suspendEstablishment,
	updateEstablishment,
} from "./facade/capabilities";
export type { CorporateAdministrationCommandOptions } from "./facade/contracts";
export {
	ActivateEstablishmentInput,
	CloseEstablishmentInput,
	GetEstablishmentInput,
	ListEstablishmentInput,
	RegisterEstablishmentInput,
	SuspendEstablishmentInput,
	UpdateEstablishmentInput,
} from "./features/entity-administration/establishments/establishments.schema";
export type {
	Establishment,
	EstablishmentStatus,
	EstablishmentStatusHistoryEntry,
	EstablishmentType,
} from "./kernel/contracts/domain";
export {
	ESTABLISHMENT_STATUSES,
	ESTABLISHMENT_TYPES,
} from "./kernel/contracts/domain";
export {
	type CorporateAdministrationApprovalPort,
	requireCorporateAdministrationApproval,
} from "./kernel/execution/approval";
export {
	type CorporateAdministrationAuthorizationPort,
	type CorporateAdministrationPermission,
	requireCorporateAdministrationPermission,
} from "./kernel/execution/authorization";
export {
	fingerprintMutation,
	type MutationReceiptStore,
} from "./kernel/execution/idempotency";
export { drizzleMutationReceiptStore } from "./kernel/execution/mutation-receipt.drizzle";
export type { CorporateAdministrationPage } from "./kernel/pagination";
export { createMemoryStore } from "./testing/memory-store";
