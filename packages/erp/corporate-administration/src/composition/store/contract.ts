import type { EstablishmentsStore } from "../../features/entity-administration/establishments/establishments.store";

export type { EstablishmentsStore } from "../../features/entity-administration/establishments/establishments.store";

/** Composite package store: the intersection of every feature store slice. */
export type CorporateAdministrationStore = EstablishmentsStore;
