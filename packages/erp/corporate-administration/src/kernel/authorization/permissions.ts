export const CORPORATE_ADMINISTRATION_PERMISSION_CODES = [
	"corporate_administration.company.read",
	"corporate_administration.company.manage",
	"corporate_administration.establishment.manage",
	"corporate_administration.governance.read",
	"corporate_administration.governance.manage",
	"corporate_administration.officer.read",
	"corporate_administration.officer.manage",
	"corporate_administration.officer_compliance.read",
	"corporate_administration.officer_compliance.manage",
	"corporate_administration.meeting.read",
	"corporate_administration.meeting.manage",
	"corporate_administration.resolution.read",
	"corporate_administration.resolution.manage",
	"corporate_administration.authority.read",
	"corporate_administration.authority.manage",
] as const;

export type CorporateAdministrationPermission =
	(typeof CORPORATE_ADMINISTRATION_PERMISSION_CODES)[number];
