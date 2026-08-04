// biome-ignore-all lint/style/noExportedImports: Branded identifiers are both local schema types and public officer contracts.
import type { z } from "zod";

import type {
	OfficerAppointmentId,
	OfficerQualificationId,
	StatutoryOfficeId,
} from "../../kernel/brands";
import type {
	amendOfficerAppointmentInputSchema,
	appointOfficerInputSchema,
	defineStatutoryOfficeInputSchema,
	getOfficerAppointmentInputSchema,
	getOfficerVacancyStatusInputSchema,
	listOfficersAsOfInputSchema,
	listRequiredStatutoryOfficesInputSchema,
	officerAppointingAuthorityTypeSchema,
	officerAppointmentListPageSchema,
	officerAppointmentMethodSchema,
	officerAppointmentSchema,
	officerAppointmentStatusSchema,
	officerQualificationSchema,
	officerQualificationVerificationStatusSchema,
	recordOfficerQualificationInputSchema,
	removeOfficerInputSchema,
	resignOfficerInputSchema,
	statutoryOfficeListPageSchema,
	statutoryOfficeSchema,
	statutoryOfficeStatusSchema,
} from "./schemas";

export type { OfficerAppointmentId, OfficerQualificationId, StatutoryOfficeId };
export type StatutoryOfficeStatus = z.infer<typeof statutoryOfficeStatusSchema>;
export type OfficerAppointmentMethod = z.infer<
	typeof officerAppointmentMethodSchema
>;
export type OfficerAppointingAuthorityType = z.infer<
	typeof officerAppointingAuthorityTypeSchema
>;
export type OfficerAppointmentStatus = z.infer<
	typeof officerAppointmentStatusSchema
>;
export type OfficerQualificationVerificationStatus = z.infer<
	typeof officerQualificationVerificationStatusSchema
>;
export type StatutoryOffice = z.infer<typeof statutoryOfficeSchema>;
export type StatutoryOfficeListPage = z.infer<
	typeof statutoryOfficeListPageSchema
>;
export type OfficerAppointment = z.infer<typeof officerAppointmentSchema>;
export type OfficerAppointmentListPage = z.infer<
	typeof officerAppointmentListPageSchema
>;
export type OfficerQualification = z.infer<typeof officerQualificationSchema>;
export type DefineStatutoryOfficeInput = z.input<
	typeof defineStatutoryOfficeInputSchema
>;
export type AppointOfficerInput = z.input<typeof appointOfficerInputSchema>;
export type AmendOfficerAppointmentInput = z.input<
	typeof amendOfficerAppointmentInputSchema
>;
export type RecordOfficerQualificationInput = z.input<
	typeof recordOfficerQualificationInputSchema
>;
export type ResignOfficerInput = z.input<typeof resignOfficerInputSchema>;
export type RemoveOfficerInput = z.input<typeof removeOfficerInputSchema>;
export type ListRequiredStatutoryOfficesInput = z.input<
	typeof listRequiredStatutoryOfficesInputSchema
>;
export type ListOfficersAsOfInput = z.input<typeof listOfficersAsOfInputSchema>;
export type GetOfficerAppointmentInput = z.input<
	typeof getOfficerAppointmentInputSchema
>;
export type GetOfficerVacancyStatusInput = z.input<
	typeof getOfficerVacancyStatusInputSchema
>;

export type OfficerVacancyStatus = Readonly<{
	statutoryOfficeId: StatutoryOfficeId;
	legalCompanyId: StatutoryOffice["legalCompanyId"];
	asOf: string;
	required: boolean;
	minimumHolders: number;
	maximumHolders: number | null;
	activeHolderCount: number;
	vacant: boolean;
	overfilled: boolean;
	gracePeriodEndsOn: string | null;
	withinGracePeriod: boolean;
}>;
