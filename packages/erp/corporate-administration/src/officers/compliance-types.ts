import type { z } from "zod";
import type {
	OfficerConflictDisclosureId,
	OfficerDeclarationId,
	OfficerDisqualificationId,
} from "../kernel/brands";
import type {
	conflictDisclosureSchema,
	conflictDisclosureStatusSchema,
	conflictMatterTypeSchema,
	discloseConflictInputSchema,
	endOfficerDisqualificationInputSchema,
	getOfficerEligibilityAsOfInputSchema,
	listActiveDisqualificationsInputSchema,
	listConflictsForMatterInputSchema,
	listExpiringDeclarationsInputSchema,
	officerDeclarationSchema,
	officerDeclarationStatusSchema,
	officerDeclarationTypeSchema,
	officerDisqualificationSchema,
	officerDisqualificationStatusSchema,
	recordOfficerDeclarationInputSchema,
	recordOfficerDisqualificationInputSchema,
	recordRecusalInputSchema,
	supersedeOfficerDeclarationInputSchema,
} from "./compliance-schemas";

export type {
	OfficerConflictDisclosureId,
	OfficerDeclarationId,
	OfficerDisqualificationId,
};
export type OfficerDeclarationType = z.infer<
	typeof officerDeclarationTypeSchema
>;
export type OfficerDeclarationStatus = z.infer<
	typeof officerDeclarationStatusSchema
>;
export type OfficerDisqualificationStatus = z.infer<
	typeof officerDisqualificationStatusSchema
>;
export type ConflictMatterType = z.infer<typeof conflictMatterTypeSchema>;
export type ConflictDisclosureStatus = z.infer<
	typeof conflictDisclosureStatusSchema
>;
export type OfficerDeclaration = z.infer<typeof officerDeclarationSchema>;
export type OfficerDisqualification = z.infer<
	typeof officerDisqualificationSchema
>;
export type ConflictDisclosure = z.infer<typeof conflictDisclosureSchema>;
export type RecordOfficerDeclarationInput = z.input<
	typeof recordOfficerDeclarationInputSchema
>;
export type SupersedeOfficerDeclarationInput = z.input<
	typeof supersedeOfficerDeclarationInputSchema
>;
export type RecordOfficerDisqualificationInput = z.input<
	typeof recordOfficerDisqualificationInputSchema
>;
export type EndOfficerDisqualificationInput = z.input<
	typeof endOfficerDisqualificationInputSchema
>;
export type DiscloseConflictInput = z.input<typeof discloseConflictInputSchema>;
export type RecordRecusalInput = z.input<typeof recordRecusalInputSchema>;
export type GetOfficerEligibilityAsOfInput = z.input<
	typeof getOfficerEligibilityAsOfInputSchema
>;
export type ListExpiringDeclarationsInput = z.input<
	typeof listExpiringDeclarationsInputSchema
>;
export type ListActiveDisqualificationsInput = z.input<
	typeof listActiveDisqualificationsInputSchema
>;
export type ListConflictsForMatterInput = z.input<
	typeof listConflictsForMatterInputSchema
>;

export type OfficerEligibilityAsOf = Readonly<{
	officerAppointmentId: OfficerDeclaration["officerAppointmentId"];
	asOf: string;
	eligible: boolean;
	activeDisqualificationCount: number;
	currentDeclarationTypes: readonly OfficerDeclarationType[];
	missingDeclarationTypes: readonly OfficerDeclarationType[];
}>;
