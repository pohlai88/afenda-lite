export const CORPORATE_ADMINISTRATION_PERMISSION_CODES = [
	"corporate_administration.company.read",
	"corporate_administration.company.manage",
	"corporate_administration.establishment.manage",
] as const;

export type CorporateAdministrationPermission =
	(typeof CORPORATE_ADMINISTRATION_PERMISSION_CODES)[number];
