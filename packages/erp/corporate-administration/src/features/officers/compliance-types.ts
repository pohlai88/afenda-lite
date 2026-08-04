// biome-ignore-all lint/style/noExportedImports: Branded identifiers are both local schema types and public compliance contracts.
import type { z } from "zod";
import type {
	OfficerConflictDisclosureId,
	OfficerDeclarationId,
	OfficerDisqualificationId,
} from "../../kernel/brands";
import type {
	conflictDisclosureListPageSchema,
	conflictDisclosureSchema,
	conflictDisclosureStatusSchema,
	conflictMatterTypeSchema,
	discloseConflictInputSchema,
	endOfficerDisqualificationInputSchema,
	getOfficerEligibilityAsOfInputSchema,
	listActiveDisqualificationsInputSchema,
	listConflictsForMatterInputSchema,
	listExpiringDeclarationsInputSchema,
	officerDeclarationListPageSchema,
	officerDeclarationSchema,
	officerDeclarationStatusSchema,
	officerDeclarationTypeSchema,
	officerDisqualificationListPageSchema,
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
export type OfficerDeclarationListPage = z.infer<
	typeof officerDeclarationListPageSchema
>;
export type OfficerDisqualification = z.infer<
	typeof officerDisqualificationSchema
>;
export type OfficerDisqualificationListPage = z.infer<
	typeof officerDisqualificationListPageSchema
>;
export type ConflictDisclosure = z.infer<typeof conflictDisclosureSchema>;
export type ConflictDisclosureListPage = z.infer<
	typeof conflictDisclosureListPageSchema
>;
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
