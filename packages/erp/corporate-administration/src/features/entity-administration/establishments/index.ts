export const EstablishmentsFeature = {
	id: "establishments",
} as const;

export type {
	Establishment,
	EstablishmentStatus,
	EstablishmentStatusHistoryEntry,
	EstablishmentType,
} from "../../../kernel/contracts/domain";
export {
	ESTABLISHMENT_STATUSES,
	ESTABLISHMENT_TYPES,
} from "../../../kernel/contracts/domain";
export { createMemoryEstablishmentsMethods } from "./establishments.memory";
export {
	activateEstablishmentOperation,
	closeEstablishmentOperation,
	type EstablishmentsOperationDeps,
	getEstablishmentOperation,
	listEstablishmentsOperation,
	registerEstablishmentOperation,
	suspendEstablishmentOperation,
	updateEstablishmentOperation,
} from "./establishments.operations";
export {
	ActivateEstablishmentInput,
	CloseEstablishmentInput,
	GetEstablishmentInput,
	ListEstablishmentInput,
	RegisterEstablishmentInput,
	SuspendEstablishmentInput,
	UpdateEstablishmentInput,
} from "./establishments.schema";
export type { EstablishmentsStore } from "./establishments.store";
export {
	CORPORATE_ADMINISTRATION_ESTABLISHMENTS_COMMANDS,
	CORPORATE_ADMINISTRATION_ESTABLISHMENTS_QUERIES,
} from "./operation-registry";
