// biome-ignore-all lint/style/noExportedImports: Branded identifiers are both local schema types and public domain contracts.
import type { z } from "zod";

import type {
	EstablishmentStatusHistoryId,
	LegalEstablishmentId,
	PremiseId,
	RegisteredAddressId,
} from "../kernel/brands";
import type {
	activateLegalEstablishmentInputSchema,
	closeLegalEstablishmentInputSchema,
	endPremiseInputSchema,
	establishmentStatusHistorySchema,
	findRegisteredAddressAsOfInputSchema,
	getLegalEstablishmentInputSchema,
	legalEstablishmentSchema,
	legalEstablishmentStatusSchema,
	legalEstablishmentTypeSchema,
	listLegalEstablishmentsAsOfInputSchema,
	listPremisesAsOfInputSchema,
	premiseSchema,
	premiseTypeSchema,
	registeredAddressSchema,
	registeredAddressTypeSchema,
	registerLegalEstablishmentInputSchema,
	registerPremiseInputSchema,
	setRegisteredAddressInputSchema,
	statutoryAddressSnapshotSchema,
	suspendLegalEstablishmentInputSchema,
	updateLegalEstablishmentInputSchema,
} from "./schemas";

export type {
	EstablishmentStatusHistoryId,
	LegalEstablishmentId,
	PremiseId,
	RegisteredAddressId,
};
export type LegalEstablishmentType = z.infer<
	typeof legalEstablishmentTypeSchema
>;
export type LegalEstablishmentStatus = z.infer<
	typeof legalEstablishmentStatusSchema
>;
export type RegisteredAddressType = z.infer<typeof registeredAddressTypeSchema>;
export type PremiseType = z.infer<typeof premiseTypeSchema>;
export type StatutoryAddressSnapshot = z.infer<
	typeof statutoryAddressSnapshotSchema
>;
export type LegalEstablishment = z.infer<typeof legalEstablishmentSchema>;
export type EstablishmentStatusHistory = z.infer<
	typeof establishmentStatusHistorySchema
>;
export type RegisteredAddress = z.infer<typeof registeredAddressSchema>;
export type Premise = z.infer<typeof premiseSchema>;

export type RegisterLegalEstablishmentInput = z.input<
	typeof registerLegalEstablishmentInputSchema
>;
export type UpdateLegalEstablishmentInput = z.input<
	typeof updateLegalEstablishmentInputSchema
>;
export type ActivateLegalEstablishmentInput = z.input<
	typeof activateLegalEstablishmentInputSchema
>;
export type SuspendLegalEstablishmentInput = z.input<
	typeof suspendLegalEstablishmentInputSchema
>;
export type CloseLegalEstablishmentInput = z.input<
	typeof closeLegalEstablishmentInputSchema
>;
export type SetRegisteredAddressInput = z.input<
	typeof setRegisteredAddressInputSchema
>;
export type RegisterPremiseInput = z.input<typeof registerPremiseInputSchema>;
export type EndPremiseInput = z.input<typeof endPremiseInputSchema>;
export type GetLegalEstablishmentInput = z.input<
	typeof getLegalEstablishmentInputSchema
>;
export type ListLegalEstablishmentsAsOfInput = z.input<
	typeof listLegalEstablishmentsAsOfInputSchema
>;
export type FindRegisteredAddressAsOfInput = z.input<
	typeof findRegisteredAddressAsOfInputSchema
>;
export type ListPremisesAsOfInput = z.input<typeof listPremisesAsOfInputSchema>;
