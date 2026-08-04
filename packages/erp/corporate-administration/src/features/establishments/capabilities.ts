import type { EstablishmentStore } from "./store";

export type RegisteredAddressEvidencePort = Pick<
	EstablishmentStore,
	"findRegisteredAddressAsOf"
>;
